-- Script para actualizar la vista_metricas_clientes con Inteligencia de Frecuencia
-- Adaptado al esquema canónico completo (incluyendo negocio_id, user_id, categoria_id, etc.)

-- 1. Eliminar la vista temporalmente
DROP VIEW IF EXISTS vista_metricas_clientes;

-- 2. Recrear la vista con todas las columnas del esquema canónico
CREATE VIEW vista_metricas_clientes AS
SELECT
  c.id,
  c.negocio_id,
  c.user_id,
  c.nombre,
  c.tipo_negocio,
  c.categoria_id,
  cat.nombre AS categoria_nombre,
  c.celular,
  c.precio_sugerido,
  c.latitud,
  c.longitud,
  c.activo,
  
  -- Usamos únicamente "cantidad" ya que "kilos_vendidos" ya no existe
  COALESCE(SUM(
    CASE 
      WHEN v.resultado = 'Venta' THEN v.cantidad
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
  END AS dias_desde_ultima_compra,

  -- ====================================================================
  -- NUEVO MOTOR: FRECUENCIA ESTIMADA DE COMPRA
  -- Calcula (Días entre primera y última venta) / (Total de ventas - 1)
  -- ====================================================================
  COALESCE(
    CASE 
      WHEN COUNT(v.id) FILTER (WHERE v.resultado = 'Venta') > 1 THEN
        EXTRACT(DAY FROM (
          MAX(CASE WHEN v.resultado = 'Venta' THEN v.fecha ELSE NULL END) - 
          MIN(CASE WHEN v.resultado = 'Venta' THEN v.fecha ELSE NULL END)
        )) / NULLIF(COUNT(v.id) FILTER (WHERE v.resultado = 'Venta') - 1, 0)
      ELSE NULL
    END, 
    15
  )::INTEGER AS frecuencia_compra_dias

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

-- Si estabas probando INSERTS de prueba y te da el mismo error en "kilos_vendidos",
-- Aquí están con "cantidad" corregido:
/*
INSERT INTO visitas (cliente_id, resultado, tipo_trapo, precio_kilo_aplicado, cantidad, monto_total, monto_pagado) 
SELECT id, 'Venta', 'Industrial', 25.00, 10.0, 250.00, 200.00 FROM clientes WHERE nombre = 'Taller Los Pinos';

INSERT INTO visitas (cliente_id, resultado, tipo_trapo, precio_kilo_aplicado, cantidad, monto_total, monto_pagado) 
SELECT id, 'Venta', 'Blanco', 30.00, 8.0, 240.00, 240.00 FROM clientes WHERE nombre = 'Torno González';
*/