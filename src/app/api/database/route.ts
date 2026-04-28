import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

type QueryOperation = 'select' | 'insert' | 'update';

type Filter = {
  column: string;
  value: unknown;
};

type Order = {
  column: string;
  ascending: boolean;
};

type LocalQueryPayload = {
  table: string;
  operation: QueryOperation;
  columns?: string;
  values?: QueryRow | QueryRow[];
  filters?: Filter[];
  order?: Order;
};

type QueryRow = Record<string, unknown>;

type QueryError = {
  message: string;
};

type QueryResult<T> = {
  data: T | null;
  error: QueryError | null;
};

const globalForPg = globalThis as typeof globalThis & {
  pgPool?: Pool;
};

function getPool() {
  if (!globalForPg.pgPool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('Falta DATABASE_URL para conectar a PostgreSQL local');
    }

    globalForPg.pgPool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  }

  return globalForPg.pgPool;
}

function assertSafeIdentifier(value: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    throw new Error(`Identificador no permitido: ${value}`);
  }
}

function buildColumnList(columns: string) {
  if (columns.trim() === '*') {
    return '*';
  }

  const safeColumns = columns.split(',').map((column) => column.trim());
  safeColumns.forEach(assertSafeIdentifier);
  return safeColumns.join(', ');
}

function buildWhereClause(filters: Filter[] | undefined, startIndex = 1) {
  if (!filters || filters.length === 0) {
    return { clause: '', values: [] as unknown[] };
  }

  const values: unknown[] = [];
  const conditions = filters.map((filter, index) => {
    assertSafeIdentifier(filter.column);
    values.push(filter.value);
    return `${filter.column} = $${startIndex + index}`;
  });

  return {
    clause: `WHERE ${conditions.join(' AND ')}`,
    values,
  };
}

function buildOrderClause(order?: Order) {
  if (!order) {
    return '';
  }

  assertSafeIdentifier(order.column);
  return `ORDER BY ${order.column} ${order.ascending ? 'ASC' : 'DESC'}`;
}

function isQueryRow(value: unknown): value is QueryRow {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

async function executeSelect<T>(payload: LocalQueryPayload): Promise<QueryResult<T[]>> {
  const pool = getPool();
  assertSafeIdentifier(payload.table);

  const columns = buildColumnList(payload.columns ?? '*');
  const where = buildWhereClause(payload.filters);
  const order = buildOrderClause(payload.order);

  const queryParts = [`SELECT ${columns} FROM ${payload.table}`, where.clause, order].filter(Boolean);
  const result = await pool.query(queryParts.join(' '), where.values);

  return {
    data: result.rows as T[],
    error: null,
  };
}

async function executeInsert<T>(payload: LocalQueryPayload): Promise<QueryResult<T[]>> {
  const pool = getPool();
  assertSafeIdentifier(payload.table);

  const rows = Array.isArray(payload.values)
    ? payload.values
    : isQueryRow(payload.values)
      ? [payload.values]
      : [];

  if (rows.length === 0 || Object.keys(rows[0] ?? {}).length === 0) {
    throw new Error('No hay datos para insertar');
  }

  const keys = Object.keys(rows[0] ?? {});
  keys.forEach(assertSafeIdentifier);

  const placeholders = rows
    .map((row, rowIndex) => {
      const rowValues = keys.map((key) => row?.[key]);
      const rowPlaceholders = keys.map((_, keyIndex) => `$${rowIndex * keys.length + keyIndex + 1}`);
      return {
        placeholders: `(${rowPlaceholders.join(', ')})`,
        values: rowValues,
      };
    });

  const values = placeholders.flatMap((item) => item.values);
  const sql = [
    `INSERT INTO ${payload.table} (${keys.join(', ')})`,
    `VALUES ${placeholders.map((item) => item.placeholders).join(', ')}`,
    'RETURNING *',
  ].join(' ');

  const result = await pool.query(sql, values);

  return {
    data: result.rows as T[],
    error: null,
  };
}

async function executeUpdate<T>(payload: LocalQueryPayload): Promise<QueryResult<T[]>> {
  const pool = getPool();
  assertSafeIdentifier(payload.table);

  if (!isQueryRow(payload.values)) {
    throw new Error('Para update, values debe ser un objeto');
  }

  const updateValues = payload.values;
  const keys = Object.keys(updateValues);

  if (keys.length === 0) {
    throw new Error('No hay datos para actualizar');
  }

  keys.forEach(assertSafeIdentifier);

  const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');
  const setValues = keys.map((key) => updateValues[key]);
  const where = buildWhereClause(payload.filters, keys.length + 1);

  const sql = [`UPDATE ${payload.table} SET ${setClause}`, where.clause, 'RETURNING *']
    .filter(Boolean)
    .join(' ');

  const result = await pool.query(sql, [...setValues, ...where.values]);

  return {
    data: result.rows as T[],
    error: null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as LocalQueryPayload;

    if (!payload?.table || !payload?.operation) {
      return NextResponse.json<QueryResult<unknown>>(
        {
          data: null,
          error: { message: 'Solicitud inválida para la base local' },
        },
        { status: 400 },
      );
    }

    let result: QueryResult<unknown[]>;

    switch (payload.operation) {
      case 'select':
        result = await executeSelect(payload);
        break;
      case 'insert':
        result = await executeInsert(payload);
        break;
      case 'update':
        result = await executeUpdate(payload);
        break;
      default:
        return NextResponse.json<QueryResult<unknown>>(
          {
            data: null,
            error: { message: `Operación no soportada: ${payload.operation}` },
          },
          { status: 400 },
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido en PostgreSQL local';

    return NextResponse.json<QueryResult<unknown>>(
      {
        data: null,
        error: { message },
      },
      { status: 500 },
    );
  }
}