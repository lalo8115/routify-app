import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { clearLocalSession } from '@/lib/local-session';

type DatabaseSource = 'local' | 'supabase';
type QueryOperation = 'select' | 'insert' | 'update' | 'single';

export type QueryError = {
  message: string;
};

export type QueryResult<T> = {
  data: T | null;
  error: QueryError | null;
};

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
  values?: Record<string, unknown> | Array<Record<string, unknown>>;
  filters?: Filter[];
  order?: Order;
};

function getDatabaseSource(): DatabaseSource {
  return (process.env.DATABASE_SOURCE?.toLowerCase() === 'local' ? 'local' : 'supabase');
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan las variables de entorno de Supabase. Verifica tu archivo .env.local');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

function getLocalApiUrl() {
  if (typeof window !== 'undefined') {
    return '/api/database';
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return new URL('/api/database', baseUrl).toString();
}

class LocalQueryBuilder<T> implements PromiseLike<QueryResult<T>> {
  private operation: QueryOperation = 'select';
  private columns = '*';
  private values?: Record<string, unknown> | Array<Record<string, unknown>>;
  private filters: Filter[] = [];
  private sortOrder?: Order;
  private pendingResult?: Promise<QueryResult<T>>;

  constructor(private readonly table: string) {}

  select(columns = '*') {
    this.operation = 'select';
    this.columns = columns;
    return this;
  }

  insert(values: Record<string, unknown> | Array<Record<string, unknown>>) {
    this.operation = 'insert';
    this.values = values;
    return this;
  }

  update(values: Record<string, unknown>) {
    this.operation = 'update';
    this.values = values;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  single() {
    this.operation = 'single';
    return this;
  }

  order(column: string, options?: boolean | { ascending?: boolean }) {
    const ascending = typeof options === 'boolean' ? options : options?.ascending ?? true;
    this.sortOrder = { column, ascending };
    return this;
  }

  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    this.pendingResult ??= this.execute();
    return this.pendingResult.then(onfulfilled, onrejected);
  }

  private async execute(): Promise<QueryResult<T>> {
    const response = await fetch(getLocalApiUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        table: this.table,
        operation: this.operation,
        columns: this.columns,
        values: this.values,
        filters: this.filters,
        order: this.sortOrder,
      } satisfies LocalQueryPayload),
    });

    const payload = (await response.json()) as QueryResult<T>;

    if (!response.ok && !payload.error) {
      return {
        data: null,
        error: {
          message: `Error al consultar la base local: ${response.status}`,
        },
      };
    }

    return payload;
  }
}

class HybridDatabaseClient {
  private browserClient: SupabaseClient | null = null;

  private getBrowserClient() {
    if (!this.browserClient) {
      this.browserClient = getSupabaseClient();
    }

    return this.browserClient;
  }

  auth = {
    signOut: async () => {
      if (getDatabaseSource() === 'local') {
        clearLocalSession();
        return { error: null };
      }

      return this.getBrowserClient().auth.signOut();
    },
    getSession: async () => {
      if (getDatabaseSource() === 'local') {
        return { data: { session: null }, error: null };
      }

      return this.getBrowserClient().auth.getSession();
    },
    getUser: async () => {
      if (getDatabaseSource() === 'local') {
        return { data: { user: null }, error: null };
      }

      return this.getBrowserClient().auth.getUser();
    },
    signInWithPassword: async (credentials: { email: string; password: string }) => {
      if (getDatabaseSource() === 'local') {
        return {
          data: { user: null, session: null },
          error: {
            message: 'Autenticación Supabase no disponible en modo local',
          },
        };
      }

      return this.getBrowserClient().auth.signInWithPassword(credentials);
    },
  };

  from(table: string): any {
    if (getDatabaseSource() === 'local') {
      return new LocalQueryBuilder(table) as any;
    }

    return getSupabaseClient().from(table) as any;
  }
}

export const databaseSource = getDatabaseSource();
export const supabase = new HybridDatabaseClient();