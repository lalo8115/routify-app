-- =====================================================
-- TrapoApp - Esquema Canónico (fuente de verdad)
-- =====================================================
-- Uso recomendado:
-- 1) Crear DB vacía
-- 2) Ejecutar este archivo
-- 3) (Opcional) Ejecutar seed_demo.sql
--
-- Este esquema está alineado al estado actual del frontend:
-- - Modelo híbrido clásico + SaaS
-- - Tablas: negocios, usuarios_negocio, categorias_cliente, productos,
--           clientes, visitas
-- - Vista: vista_metricas_clientes
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_negocio_enum') THEN
    CREATE TYPE tipo_negocio_enum AS ENUM ('Mecánico', 'Torno', 'Rectificadora', 'Hojalatería', 'Otro');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resultado_visita_enum') THEN
    CREATE TYPE resultado_visita_enum AS ENUM ('Venta', 'No_Venta', 'Abono');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_trapo_enum') THEN
    CREATE TYPE tipo_trapo_enum AS ENUM ('Blanco', 'Color', 'Industrial', 'Estopa', 'N/A');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS negocios (
  id UUID PRIMARY KEY,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuarios_negocio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'vendedor',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categorias_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  unidad_medida TEXT NOT NULL DEFAULT 'pz',
  precio_base NUMERIC(10,2) NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  user_id UUID,
  categoria_id UUID REFERENCES categorias_cliente(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  tipo_negocio tipo_negocio_enum NOT NULL DEFAULT 'Otro',
  celular TEXT NOT NULL,
  precio_sugerido NUMERIC(10,2) NOT NULL DEFAULT 0,
  latitud NUMERIC(11,8) NOT NULL,
  longitud NUMERIC(11,8) NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  user_id UUID,
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
  resultado resultado_visita_enum NOT NULL,
  tipo_trapo tipo_trapo_enum DEFAULT 'N/A',
  precio_kilo_aplicado NUMERIC(10,2),
  kilos_vendidos NUMERIC(10,2),
  precio_unitario NUMERIC(10,2),
  cantidad NUMERIC(10,2),
  monto_total NUMERIC(10,2),
  monto_pagado NUMERIC(10,2),
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_negocio_negocio_id ON usuarios_negocio(negocio_id);
CREATE INDEX IF NOT EXISTS idx_categorias_cliente_negocio_id ON categorias_cliente(negocio_id);
CREATE INDEX IF NOT EXISTS idx_productos_negocio_id ON productos(negocio_id);
CREATE INDEX IF NOT EXISTS idx_clientes_negocio_id ON clientes(negocio_id);
CREATE INDEX IF NOT EXISTS idx_clientes_categoria_id ON clientes(categoria_id);
CREATE INDEX IF NOT EXISTS idx_visitas_negocio_id ON visitas(negocio_id);
CREATE INDEX IF NOT EXISTS idx_visitas_cliente_id ON visitas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_visitas_producto_id ON visitas(producto_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_negocios_updated_at ON negocios;
CREATE TRIGGER update_negocios_updated_at
  BEFORE UPDATE ON negocios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usuarios_negocio_updated_at ON usuarios_negocio;
CREATE TRIGGER update_usuarios_negocio_updated_at
  BEFORE UPDATE ON usuarios_negocio
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_categorias_updated_at ON categorias_cliente;
CREATE TRIGGER update_categorias_updated_at
  BEFORE UPDATE ON categorias_cliente
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_productos_updated_at ON productos;
CREATE TRIGGER update_productos_updated_at
  BEFORE UPDATE ON productos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_visitas_updated_at ON visitas;
CREATE TRIGGER update_visitas_updated_at
  BEFORE UPDATE ON visitas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE VIEW vista_metricas_clientes AS
SELECT
  c.id,
  c.negocio_id,
  c.user_id,
  c.categoria_id,
  cat.nombre AS categoria_nombre,
  c.nombre,
  c.tipo_negocio,
  c.celular,
  c.precio_sugerido,
  c.latitud,
  c.longitud,
  c.activo,
  COALESCE(SUM(CASE WHEN v.resultado = 'Venta' THEN COALESCE(v.cantidad, v.kilos_vendidos, 0) ELSE 0 END), 0) AS total_kilos_comprados,
  COALESCE(SUM(CASE WHEN v.resultado IN ('Venta', 'Abono') THEN COALESCE(v.monto_total, 0) - COALESCE(v.monto_pagado, 0) ELSE 0 END), 0) AS deuda_pendiente,
  MAX(CASE WHEN v.resultado = 'Venta' THEN v.fecha ELSE NULL END) AS ultima_fecha_compra,
  CASE
    WHEN MAX(CASE WHEN v.resultado = 'Venta' THEN v.fecha ELSE NULL END) IS NOT NULL
    THEN EXTRACT(DAY FROM (NOW() - MAX(CASE WHEN v.resultado = 'Venta' THEN v.fecha ELSE NULL END)))::INTEGER
    ELSE NULL
  END AS dias_desde_ultima_compra
FROM clientes c
LEFT JOIN visitas v ON c.id = v.cliente_id
LEFT JOIN categorias_cliente cat ON c.categoria_id = cat.id
GROUP BY
  c.id,
  c.negocio_id,
  c.user_id,
  c.categoria_id,
  cat.nombre,
  c.nombre,
  c.tipo_negocio,
  c.celular,
  c.precio_sugerido,
  c.latitud,
  c.longitud,
  c.activo;