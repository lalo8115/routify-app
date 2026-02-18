-- =====================================================
-- TrapoApp v1.0 - Supabase Database Schema
-- =====================================================
-- Script para ejecutar en Supabase SQL Editor
-- Orden: Enums → Tablas → Llaves Foráneas → Vista
-- =====================================================

-- 1. CREAR TIPOS ENUM
-- =====================================================

-- Enum para tipos de negocio
CREATE TYPE tipo_negocio_enum AS ENUM (
  'Mecánico',
  'Torno',
  'Rectificadora',
  'Hojalatería',
  'Otro'
);

-- Enum para resultado de visita
CREATE TYPE resultado_visita_enum AS ENUM (
  'Venta',
  'No_Venta',
  'Abono'
);

-- Enum para tipos de trapo
CREATE TYPE tipo_trapo_enum AS ENUM (
  'Blanco',
  'Color',
  'Industrial',
  'Estopa',
  'N/A'
);

-- 2. CREAR TABLA: CLIENTES
-- =====================================================

CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo_negocio tipo_negocio_enum NOT NULL DEFAULT 'Otro',
  celular TEXT NOT NULL,
  precio_sugerido DECIMAL(10,2) NOT NULL,
  latitud DECIMAL(10,8) NOT NULL,
  longitud DECIMAL(10,8) NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para optimizar consultas geoespaciales
CREATE INDEX idx_clientes_activo ON clientes(activo);
CREATE INDEX idx_clientes_tipo_negocio ON clientes(tipo_negocio);
CREATE INDEX idx_clientes_latitud_longitud ON clientes(latitud, longitud);

-- 3. CREAR TABLA: VISITAS
-- =====================================================

CREATE TABLE visitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL,
  resultado resultado_visita_enum NOT NULL,
  tipo_trapo tipo_trapo_enum DEFAULT 'N/A',
  precio_kilo_aplicado DECIMAL(10,2),
  kilos_vendidos DECIMAL(10,2),
  monto_total DECIMAL(10,2),
  monto_pagado DECIMAL(10,2),
  fecha TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. LLAVES FORÁNEAS
-- =====================================================

-- Relacionar visitas con clientes
ALTER TABLE visitas
  ADD CONSTRAINT fk_visitas_cliente
  FOREIGN KEY (cliente_id)
  REFERENCES clientes(id)
  ON DELETE CASCADE;

-- Índices para mejorar rendimiento en joins
CREATE INDEX idx_visitas_cliente_id ON visitas(cliente_id);
CREATE INDEX idx_visitas_fecha ON visitas(fecha DESC);
CREATE INDEX idx_visitas_resultado ON visitas(resultado);

-- 5. CREAR VISTA: vista_metricas_clientes
-- =====================================================
-- Esta vista calcula dinámicamente las métricas de cada cliente
-- sin desnormalizar la base de datos

CREATE OR REPLACE VIEW vista_metricas_clientes AS
SELECT
  c.id,
  c.nombre,
  c.tipo_negocio,
  c.celular,
  c.precio_sugerido,
  c.latitud,
  c.longitud,
  c.activo,
  
  -- Total de kilos comprados (suma de todas las ventas)
  COALESCE(SUM(
    CASE 
      WHEN v.resultado = 'Venta' THEN v.kilos_vendidos
      ELSE 0
    END
  ), 0) AS total_kilos_comprados,
  
  -- Deuda pendiente (monto_total - monto_pagado)
  COALESCE(SUM(
    CASE 
      WHEN v.resultado IN ('Venta', 'Abono') 
      THEN COALESCE(v.monto_total, 0) - COALESCE(v.monto_pagado, 0)
      ELSE 0
    END
  ), 0) AS deuda_pendiente,
  
  -- Última fecha de compra (solo ventas)
  MAX(
    CASE 
      WHEN v.resultado = 'Venta' THEN v.fecha
      ELSE NULL
    END
  ) AS ultima_fecha_compra,
  
  -- Días desde la última compra
  CASE 
    WHEN MAX(CASE WHEN v.resultado = 'Venta' THEN v.fecha ELSE NULL END) IS NOT NULL
    THEN EXTRACT(DAY FROM (NOW() - MAX(CASE WHEN v.resultado = 'Venta' THEN v.fecha ELSE NULL END)))::INTEGER
    ELSE NULL
  END AS dias_desde_ultima_compra

FROM clientes c
LEFT JOIN visitas v ON c.id = v.cliente_id
GROUP BY c.id, c.nombre, c.tipo_negocio, c.celular, c.precio_sugerido, 
         c.latitud, c.longitud, c.activo;

-- 6. POLÍTICAS DE SEGURIDAD (RLS - Row Level Security)
-- =====================================================
-- Habilitar RLS en las tablas principales

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitas ENABLE ROW LEVEL SECURITY;

-- Política para permitir todas las operaciones (ajusta según tus necesidades de autenticación)
-- IMPORTANTE: En producción, debes configurar políticas más restrictivas basadas en usuarios

CREATE POLICY "Permitir todas las operaciones en clientes"
  ON clientes
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir todas las operaciones en visitas"
  ON visitas
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. FUNCIÓN PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en clientes
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. DATOS DE EJEMPLO (OPCIONAL - PARA TESTING)
-- =====================================================
-- Descomentar para insertar datos de prueba

/*
INSERT INTO clientes (nombre, tipo_negocio, celular, precio_sugerido, latitud, longitud) VALUES
  ('Taller Los Pinos', 'Mecánico', '+525512345678', 25.00, 25.7460, -100.2801),
  ('Torno González', 'Torno', '+525587654321', 30.00, 25.7480, -100.2850),
  ('Rectificadora del Norte', 'Rectificadora', '+525555555555', 28.00, 25.7500, -100.2900),
  ('Hojalatería Express', 'Hojalatería', '+525544444444', 22.00, 25.7420, -100.2750);

INSERT INTO visitas (cliente_id, resultado, tipo_trapo, precio_kilo_aplicado, kilos_vendidos, monto_total, monto_pagado) 
SELECT 
  id, 
  'Venta', 
  'Industrial', 
  25.00, 
  10.0, 
  250.00, 
  200.00
FROM clientes WHERE nombre = 'Taller Los Pinos';
*/

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
-- Para verificar que todo se creó correctamente, ejecuta:
-- SELECT * FROM vista_metricas_clientes;
