-- =====================================================
-- RESPALDO COMPLETO - TrapoApp Multi-Tenant
-- Fecha: 2026-02-18
-- Estado: MIGRACIÓN COMPLETA ✅
-- =====================================================
-- Este archivo documenta el estado ACTUAL de tu base de datos
-- después de la migración a arquitectura multi-tenant
-- =====================================================

-- =====================================================
-- 1. ENUMS EXISTENTES
-- =====================================================

-- Ya existen estos ENUMs (NO recrear):
-- CREATE TYPE tipo_negocio_enum AS ENUM ('Mecánico', 'Torno', 'Rectificadora', 'Hojalatería', 'Otro');
-- CREATE TYPE resultado_visita_enum AS ENUM ('Venta', 'No_Venta', 'Abono');
-- CREATE TYPE tipo_trapo_enum AS ENUM ('Blanco', 'Color', 'Industrial', 'Estopa', 'N/A');

-- =====================================================
-- 2. TABLA: negocios (YA EXISTE) ✅
-- =====================================================

/*
CREATE TABLE negocios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
*/

-- Registro actual:
-- ID: 00000000-0000-0000-0000-000000000000
-- Nombre: 'Mi Distribuidora'

-- =====================================================
-- 3. TABLA: usuarios_negocio (YA EXISTE) ✅
-- =====================================================

/*
CREATE TABLE usuarios_negocio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  rol TEXT DEFAULT 'vendedor',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, negocio_id)
);
*/

-- Registros actuales: 0 (PENDIENTE DE CREAR)

-- =====================================================
-- 4. TABLA: clientes (MIGRADA) ✅
-- =====================================================

/*
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo_negocio tipo_negocio_enum NOT NULL DEFAULT 'Otro',
  celular TEXT NOT NULL,
  precio_sugerido NUMERIC(10,2) NOT NULL,
  latitud NUMERIC(11,8) NOT NULL,
  longitud NUMERIC(11,8) NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- COLUMNAS AGREGADAS EN MIGRACIÓN:
  negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_clientes_activo ON clientes(activo);
CREATE INDEX idx_clientes_tipo_negocio ON clientes(tipo_negocio);
CREATE INDEX idx_clientes_latitud_longitud ON clientes(latitud, longitud);
CREATE INDEX idx_clientes_negocio_id ON clientes(negocio_id);
CREATE INDEX idx_clientes_user_id ON clientes(user_id);
*/

-- Registros actuales: 5 clientes
-- Todos tienen negocio_id: 00000000-0000-0000-0000-000000000000
-- user_id: NULL (PENDIENTE DE ASIGNAR)

-- =====================================================
-- 5. TABLA: visitas (MIGRADA) ✅
-- =====================================================

/*
CREATE TABLE visitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  resultado resultado_visita_enum NOT NULL,
  tipo_trapo tipo_trapo_enum DEFAULT 'N/A',
  precio_kilo_aplicado NUMERIC(10,2),
  kilos_vendidos NUMERIC(10,2),
  monto_total NUMERIC(10,2),
  monto_pagado NUMERIC(10,2),
  fecha TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- COLUMNAS AGREGADAS EN MIGRACIÓN:
  negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_visitas_cliente_id ON visitas(cliente_id);
CREATE INDEX idx_visitas_fecha ON visitas(fecha DESC);
CREATE INDEX idx_visitas_resultado ON visitas(resultado);
CREATE INDEX idx_visitas_negocio_id ON visitas(negocio_id);
CREATE INDEX idx_visitas_user_id ON visitas(user_id);
*/

-- Registros actuales: 3 visitas
-- Todas tienen negocio_id: 00000000-0000-0000-0000-000000000000
-- user_id: NULL (PENDIENTE DE ASIGNAR)

-- =====================================================
-- 6. VISTA: vista_metricas_clientes (ACTUALIZADA) ✅
-- =====================================================

CREATE OR REPLACE VIEW vista_metricas_clientes AS
SELECT
  c.id,
  c.negocio_id,
  c.user_id,
  c.nombre,
  c.tipo_negocio,
  c.celular,
  c.precio_sugerido,
  c.latitud,
  c.longitud,
  c.activo,
  
  COALESCE(SUM(
    CASE 
      WHEN v.resultado = 'Venta' THEN v.kilos_vendidos
      ELSE 0
    END
  ), 0) AS total_kilos_comprados,
  
  COALESCE(SUM(
    CASE 
      WHEN v.resultado IN ('Venta', 'Abono') 
      THEN COALESCE(v.monto_total, 0) - COALESCE(v.monto_pagado, 0)
      ELSE 0
    END
  ), 0) AS deuda_pendiente,
  
  MAX(
    CASE 
      WHEN v.resultado = 'Venta' THEN v.fecha
      ELSE NULL
    END
  ) AS ultima_fecha_compra,
  
  CASE 
    WHEN MAX(CASE WHEN v.resultado = 'Venta' THEN v.fecha ELSE NULL END) IS NOT NULL
    THEN EXTRACT(DAY FROM (NOW() - MAX(CASE WHEN v.resultado = 'Venta' THEN v.fecha ELSE NULL END)))::INTEGER
    ELSE NULL
  END AS dias_desde_ultima_compra

FROM clientes c
LEFT JOIN visitas v ON c.id = v.cliente_id AND c.negocio_id = v.negocio_id
GROUP BY c.id, c.negocio_id, c.user_id, c.nombre, c.tipo_negocio, c.celular, 
         c.precio_sugerido, c.latitud, c.longitud, c.activo;

-- =====================================================
-- 7. POLÍTICAS RLS (OPCIÓN 1: COMPARTIDO) ✅
-- =====================================================

-- RLS activado en todas las tablas:
-- ALTER TABLE negocios ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE usuarios_negocio ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE visitas ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS ACTIVAS:

-- NEGOCIOS:
/*
CREATE POLICY "Usuarios ven su negocio"
  ON negocios FOR SELECT
  USING (
    id IN (SELECT negocio_id FROM usuarios_negocio WHERE user_id = auth.uid())
  );
*/

-- USUARIOS_NEGOCIO:
/*
CREATE POLICY "Usuarios ven compañeros de su negocio"
  ON usuarios_negocio FOR SELECT
  USING (
    negocio_id IN (SELECT negocio_id FROM usuarios_negocio WHERE user_id = auth.uid())
  );
*/

-- CLIENTES (todos los usuarios del negocio ven todos los clientes):
/*
CREATE POLICY "Usuarios ven todos los clientes de su negocio"
  ON clientes FOR SELECT
  USING (
    negocio_id IN (SELECT negocio_id FROM usuarios_negocio WHERE user_id = auth.uid())
  );

CREATE POLICY "Usuarios crean clientes en su negocio"
  ON clientes FOR INSERT
  WITH CHECK (
    negocio_id IN (SELECT negocio_id FROM usuarios_negocio WHERE user_id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Usuarios actualizan clientes de su negocio"
  ON clientes FOR UPDATE
  USING (
    negocio_id IN (SELECT negocio_id FROM usuarios_negocio WHERE user_id = auth.uid())
  );

CREATE POLICY "Usuarios eliminan clientes de su negocio"
  ON clientes FOR DELETE
  USING (
    negocio_id IN (SELECT negocio_id FROM usuarios_negocio WHERE user_id = auth.uid())
  );
*/

-- VISITAS (todos los usuarios del negocio ven todas las visitas):
/*
CREATE POLICY "Usuarios ven todas las visitas de su negocio"
  ON visitas FOR SELECT
  USING (
    negocio_id IN (SELECT negocio_id FROM usuarios_negocio WHERE user_id = auth.uid())
  );

CREATE POLICY "Usuarios crean visitas en su negocio"
  ON visitas FOR INSERT
  WITH CHECK (
    negocio_id IN (SELECT negocio_id FROM usuarios_negocio WHERE user_id = auth.uid())
    AND user_id = auth.uid()
  );

CREATE POLICY "Usuarios actualizan visitas de su negocio"
  ON visitas FOR UPDATE
  USING (
    negocio_id IN (SELECT negocio_id FROM usuarios_negocio WHERE user_id = auth.uid())
  );
*/

-- =====================================================
-- 8. TRIGGERS Y FUNCIONES ✅
-- =====================================================

/*
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_negocios_updated_at
  BEFORE UPDATE ON negocios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usuarios_negocio_updated_at
  BEFORE UPDATE ON usuarios_negocio
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
*/

-- =====================================================
-- 9. DATOS ACTUALES (Resumen)
-- =====================================================

-- Negocios: 1
-- Usuarios_negocio: 0 (PENDIENTE)
-- Clientes: 5 (negocio_id asignado, user_id NULL)
-- Visitas: 3 (negocio_id asignado, user_id NULL)

-- =====================================================
-- 10. PASOS PENDIENTES PARA ACTIVAR
-- =====================================================

-- PASO 1: Crear usuario en Supabase Authentication
-- Dashboard → Authentication → Users → Add user

-- PASO 2: Vincular usuario al negocio
-- Ejecuta (reemplaza TU-USER-ID con el ID del usuario creado):
/*
INSERT INTO usuarios_negocio (user_id, negocio_id, nombre, email, rol)
VALUES (
  'TU-USER-ID-AQUI',
  '00000000-0000-0000-0000-000000000000',
  'Tu Nombre',
  'tu-email@ejemplo.com',
  'admin'
);
*/

-- PASO 3: Asignar datos existentes al usuario
/*
UPDATE clientes 
SET user_id = 'TU-USER-ID-AQUI'
WHERE user_id IS NULL;

UPDATE visitas 
SET user_id = 'TU-USER-ID-AQUI'
WHERE user_id IS NULL;
*/

-- =====================================================
-- 11. QUERIES DE VERIFICACIÓN
-- =====================================================

-- Ver estructura actual:
-- SELECT * FROM negocios;
-- SELECT * FROM usuarios_negocio;
-- SELECT * FROM vista_metricas_clientes;

-- Verificar clientes sin usuario:
-- SELECT COUNT(*) FROM clientes WHERE user_id IS NULL;

-- Verificar visitas sin usuario:
-- SELECT COUNT(*) FROM visitas WHERE user_id IS NULL;

-- =====================================================
-- FIN DEL RESPALDO
-- Estado: ✅ BASE DE DATOS MIGRADA Y FUNCIONAL
-- Acción requerida: Crear y vincular usuarios
-- =====================================================