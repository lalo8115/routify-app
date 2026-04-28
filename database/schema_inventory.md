# Levantamiento de esquema de base de datos

Este documento resume qué define cada script SQL del proyecto, qué usa realmente el frontend y dónde están las inconsistencias.

## Estado general

- El esquema base vigente más simple está en [database/schema.sql](database/schema.sql).
- La versión SaaS/multi-tenant está esbozada en [database/migracion_saas_generico.sql](database/migracion_saas_generico.sql) y [database/rls_robusteced_fixed.sql](database/rls_robusteced_fixed.sql).
- El frontend actual ya mezcla ambos modelos: conserva tablas del esquema clásico y también consulta entidades del modelo SaaS como `negocios`, `usuarios_negocio`, `categorias_cliente` y `productos`.

## Lo que define cada script

### [database/schema.sql](database/schema.sql)

Define el modelo clásico de TrapoApp:

- Enums: `tipo_negocio_enum`, `resultado_visita_enum`, `tipo_trapo_enum`.
- Tablas: `clientes`, `visitas`.
- FK: `visitas.cliente_id -> clientes.id`.
- Vista: `vista_metricas_clientes`.
- RLS abierto con políticas `FOR ALL USING (true)`.
- Trigger `update_clientes_updated_at`.

### [database/migracion_saas_generico.sql](database/migracion_saas_generico.sql)

Introduce un modelo más genérico:

- Tablas nuevas: `categorias_cliente`, `productos`.
- Añade `categoria_id` a `clientes`.
- Renombra columnas en `visitas`:
  - `kilos_vendidos` -> `cantidad`
  - `precio_kilo_aplicado` -> `precio_unitario`
- Añade `producto_id` a `visitas`.
- Recrea `vista_metricas_clientes` usando `categoria_id` y `cantidad`.

### [database/rls_robusteced_fixed.sql](database/rls_robusteced_fixed.sql)

Refuerza el modelo multi-tenant:

- Espera funciones como `get_user_negocio_id(user_uuid)` y `set_tenant_fields()`.
- Asume tablas `negocios`, `usuarios_negocio`, `clientes`, `visitas`.
- Crea políticas RLS por negocio.
- Agrega triggers de auditoría y validación de tenant.

## Lo que usa el frontend hoy

### Tablas/vistas realmente consumidas

- [src/app/page.tsx](src/app/page.tsx) consulta `vista_metricas_clientes`.
- [src/app/directorio/page.tsx](src/app/directorio/page.tsx) consulta `vista_metricas_clientes`.
- [src/app/mapa/page.tsx](src/app/mapa/page.tsx) consulta `vista_metricas_clientes`.
- [src/components/NuevoClienteModal.tsx](src/components/NuevoClienteModal.tsx) consulta `categorias_cliente` e inserta en `clientes`.
- [src/components/RegistroVentaModal.tsx](src/components/RegistroVentaModal.tsx) consulta `productos` e inserta en `visitas`.
- [src/app/configuracion/page.tsx](src/app/configuracion/page.tsx) consulta `usuarios_negocio`, `categorias_cliente` y `productos`.
- [src/app/login/page.tsx](src/app/login/page.tsx) consulta `usuarios_negocio` y `negocios`.

### Campos esperados por el frontend

- `clientes`: `id`, `nombre`, `tipo_negocio`, `celular`, `precio_sugerido`, `latitud`, `longitud`, `activo`.
- `visitas`: `cliente_id`, `resultado`, `tipo_trapo`, `precio_kilo_aplicado`, `kilos_vendidos`, `monto_total`, `monto_pagado`, `fecha`.
- `vista_metricas_clientes`: `total_kilos_comprados`, `deuda_pendiente`, `ultima_fecha_compra`, `dias_desde_ultima_compra`.
- SaaS: `categorias_cliente`, `productos`, `negocios`, `usuarios_negocio`.

## Inconsistencias detectadas

1. [database/schema.sql](database/schema.sql) no define `negocios`, `usuarios_negocio`, `categorias_cliente` ni `productos`, pero el frontend ya los usa.
2. [database/migracion_saas_generico.sql](database/migracion_saas_generico.sql) asume `negocios` y `usuarios_negocio` existentes, pero no los crea.
3. [database/rls_robusteced_fixed.sql](database/rls_robusteced_fixed.sql) también asume esas tablas y funciones previas.
4. Hay mezcla de nombres antiguos y nuevos:
   - `kilos_vendidos` / `precio_kilo_aplicado` todavía aparecen en el frontend.
   - `cantidad` / `precio_unitario` aparecen en la migración SaaS.
5. `src/lib/database.ts` puede alternar entre Supabase y PostgreSQL local, pero la DB local necesita el mismo esquema lógico que la app consume.

## Conclusión práctica

Hoy el proyecto no tiene un único esquema consistente. Tiene tres capas:

- Esquema clásico funcional para TrapoApp.
- Migración SaaS parcial que moderniza catálogos y ventas.
- RLS multi-tenant que presupone una base SaaS completa.

Si tu objetivo es estabilizar el proyecto, el siguiente paso es elegir una sola línea de evolución:

- Mantener el esquema clásico y adaptar solo el frontend al modelo viejo.
- Completar el modelo SaaS creando `negocios` y `usuarios_negocio`, luego migrar todo a `categoria_id` y `producto_id`.

## Fuente de verdad actual

Desde ahora, la referencia principal del proyecto es:

- [database/schema_canonico.sql](database/schema_canonico.sql)
- [database/seed_demo.sql](database/seed_demo.sql)

Los siguientes archivos se consideran legacy/históricos y solo para consulta:

- [database/schema.sql](database/schema.sql)
- [database/migracion_saas_generico.sql](database/migracion_saas_generico.sql)
- [database/rls_robusteced_fixed.sql](database/rls_robusteced_fixed.sql)

## Recomendación mínima

Para que el modo local en Docker sea usable sin sorpresas, la base PostgreSQL local debería alinearse con una de estas dos rutas:

1. Esquema clásico completo de [database/schema.sql](database/schema.sql).
2. Esquema SaaS completo, pero agregando primero las tablas faltantes `negocios` y `usuarios_negocio` y unificando nombres de columnas.
