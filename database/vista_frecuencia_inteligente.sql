-- Script para actualizar la vista_metricas_clientes con Inteligencia de Frecuencia
-- Mantiene EXACTAMENTE tu lógica original para deuda y kilos, solo agrega la frecuencia estimada.

-- 1. Eliminar la vista temporalmente
DROP VIEW IF EXISTS vista_metricas_clientes;

-- 2. Recrear la vista preservando tu arquitectura de CASE y COALESCE e inyectando la nueva columna
CREATE VIEW vista_metricas_clientes AS
SELECT
  c.id,
  c.nombre,
  c.tipo_negocio,
  c.celular,
  c.precio_sugerido,
  c.latitud,
  c.longitud,
  c.activo,
  
  COALESCE(SUM(
    CASE 
      WHEN v.resultado = 'Venta' THEN v.cantidad
      ELSE 0
    END
  ), 0) AS total_kilos_comprados,
  
  -- Tu lógica original para deuda global (Ventas y Abonos)
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
  -- Si no hay suficientes datos (solo 1 venta o 0), asume 15 días por default
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
GROUP BY c.id, c.nombre, c.tipo_negocio, c.celular, c.precio_sugerido, 
         c.latitud, c.longitud, c.activo;