# 🛠️ Comandos Útiles

## Desarrollo
```bash
# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Iniciar servidor de producción (después de build)
npm start

# Ejecutar linter
npm run lint
```

## Base de Datos (Supabase)

### Verificar que todo funcione:
```sql
-- En el SQL Editor de Supabase:

-- Ver todos los clientes
SELECT * FROM clientes;

-- Ver todas las visitas
SELECT * FROM visitas;

-- Ver métricas calculadas
SELECT * FROM vista_metricas_clientes;

-- Ver clientes con deuda
SELECT nombre, deuda_pendiente 
FROM vista_metricas_clientes 
WHERE deuda_pendiente > 0
ORDER BY deuda_pendiente DESC;

-- Ver clientes que no compran hace tiempo
SELECT nombre, dias_desde_ultima_compra 
FROM vista_metricas_clientes 
WHERE dias_desde_ultima_compra > 15
ORDER BY dias_desde_ultima_compra DESC;
```

## Datos de Prueba

Si quieres agregar datos de prueba rápidamente, ejecuta esto en Supabase:

```sql
-- Insertar clientes de prueba
INSERT INTO clientes (nombre, tipo_negocio, celular, precio_sugerido, latitud, longitud) VALUES
  ('Taller Los Pinos', 'Mecánico', '+525512345678', 25.00, 25.7460, -100.2801),
  ('Torno González', 'Torno', '+525587654321', 30.00, 25.7480, -100.2850),
  ('Rectificadora del Norte', 'Rectificadora', '+525555555555', 28.00, 25.7500, -100.2900),
  ('Hojalatería Express', 'Hojalatería', '+525544444444', 22.00, 25.7420, -100.2750),
  ('Mecánica Central', 'Mecánico', '+525566666666', 24.00, 25.7440, -100.2780);

-- Insertar ventas de prueba
INSERT INTO visitas (cliente_id, resultado, tipo_trapo, precio_kilo_aplicado, kilos_vendidos, monto_total, monto_pagado, fecha) 
SELECT 
  id, 
  'Venta', 
  'Industrial', 
  25.00, 
  10.0, 
  250.00, 
  200.00,
  NOW() - INTERVAL '5 days'
FROM clientes WHERE nombre = 'Taller Los Pinos';

INSERT INTO visitas (cliente_id, resultado, tipo_trapo, precio_kilo_aplicado, kilos_vendidos, monto_total, monto_pagado, fecha) 
SELECT 
  id, 
  'Venta', 
  'Blanco', 
  30.00, 
  8.0, 
  240.00, 
  240.00,
  NOW() - INTERVAL '20 days'
FROM clientes WHERE nombre = 'Torno González';

INSERT INTO visitas (cliente_id, resultado, tipo_trapo, fecha) 
SELECT 
  id, 
  'No_Venta',
  'N/A',
  NOW() - INTERVAL '2 days'
FROM clientes WHERE nombre = 'Mecánica Central';
```

## Limpiar Base de Datos

Si quieres empezar de cero:

```sql
-- ⚠️ CUIDADO: Esto borra TODOS los datos

-- Borrar todas las visitas
DELETE FROM visitas;

-- Borrar todos los clientes
DELETE FROM clientes;

-- O si prefieres solo marcar clientes como inactivos:
UPDATE clientes SET activo = false;
```

## Personalización Rápida

### Cambiar coordenadas por defecto del mapa:
Edita `src/components/MapView.tsx`, línea 20:
```typescript
const DEFAULT_CENTER: [number, number] = [TU_LATITUD, TU_LONGITUD];
```

### Cambiar umbral de días (pines rojos):
Edita `src/components/MapView.tsx`, línea 145:
```typescript
const diasSinCompra = cliente.dias_desde_ultima_compra ?? 999;
const icono = diasSinCompra > 15 ? iconoRojo : iconoVerde; // Cambia 15 por el número que quieras
```

### Cambiar mensaje de WhatsApp:
Edita `src/app/directorio/page.tsx`, línea 77:
```typescript
const mensaje = '¡Tu mensaje personalizado aquí!';
```

### Agregar más tipos de trapo:
1. Edita `database/schema.sql` línea 24
2. Agrega el nuevo tipo en el ENUM
3. Reejecutar el script o ejecutar:
```sql
ALTER TYPE tipo_trapo_enum ADD VALUE 'NuevoTipo';
```
4. Edita `src/types/index.ts` línea 5
5. Actualiza `src/components/RegistroVentaModal.tsx` línea 17

### Cambiar colores del tema:
Edita `tailwind.config.ts`:
```typescript
primary: {
  500: '#TU_COLOR_AQUI',
  600: '#TU_COLOR_AQUI',
  // etc...
}
```

## Deploy

### Vercel (Recomendado)
```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel

# Deploy a producción
vercel --prod
```

### Variables de entorno en Vercel:
1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Actualizar Proyecto

Para actualizar dependencias en el futuro:
```bash
# Ver paquetes desactualizados
npm outdated

# Actualizar todos (cuidado, puede romper cosas)
npm update

# Actualizar Next.js específicamente
npm install next@latest react@latest react-dom@latest
```

## Solución de Problemas Comunes

### "Module not found: Can't resolve 'leaflet'"
```bash
npm install leaflet react-leaflet @types/leaflet
```

### "Error: listen EADDRINUSE: address already in use :::3000"
```bash
# Mata el proceso en el puerto 3000
npx kill-port 3000

# O usa otro puerto
npm run dev -- -p 3001
```

### Limpiar caché de Next.js
```bash
rm -rf .next
npm run dev
```

## Backup de Base de Datos

En Supabase:
1. Ve a Database → Backups
2. Descarga el backup más reciente
3. O usa pg_dump si tienes acceso directo

## Monitoreo

Ver logs en tiempo real:
- **Supabase:** Database → Logs
- **Vercel:** Tu proyecto → Deployments → View Function Logs

---

¡Guardar este archivo para referencia rápida! 📑
