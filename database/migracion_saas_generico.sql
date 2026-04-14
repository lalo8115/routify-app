-- =====================================================
-- MIGRACIÓN DE SAAS v1 A v2: CRM AGNÓSTICO
-- =====================================================
-- Este script transforma TrapoApp en un CRM genérico multi-tenant.
-- Reemplaza los ENUMs estáticos por tablas configurables por negocio.
-- Renombra columnas específicas (kilos_vendidos) a genéricas (cantidad).
-- =====================================================

-- =====================================================
-- 1. CREAR NUEVAS TABLAS CONFIGURABLES POR TENANT
-- =====================================================

-- Tabla para categorizar clientes (Reemplaza tipo_negocio_enum)
CREATE TABLE public.categorias_cliente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de catálogo de productos (Reemplaza tipo_trapo_enum)
CREATE TABLE public.productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negocio_id UUID NOT NULL REFERENCES public.negocios(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    unidad_medida TEXT DEFAULT 'pz', -- kg, lts, pz, etc.
    precio_base DECIMAL(10,2) DEFAULT 0.00,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para rendimiento
CREATE INDEX idx_categorias_negocio ON public.categorias_cliente(negocio_id);
CREATE INDEX idx_productos_negocio ON public.productos(negocio_id);

-- =====================================================
-- 2. HABILITAR RLS EN NUEVAS TABLAS
-- =====================================================

ALTER TABLE public.categorias_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

-- Políticas para categorias_cliente
CREATE POLICY "categorias_select_negocio" ON public.categorias_cliente FOR SELECT TO authenticated USING (negocio_id = get_user_negocio_id(auth.uid()));
CREATE POLICY "categorias_insert_negocio" ON public.categorias_cliente FOR INSERT TO authenticated WITH CHECK (negocio_id = get_user_negocio_id(auth.uid()));
CREATE POLICY "categorias_update_negocio" ON public.categorias_cliente FOR UPDATE TO authenticated USING (negocio_id = get_user_negocio_id(auth.uid())) WITH CHECK (negocio_id = get_user_negocio_id(auth.uid()));
CREATE POLICY "categorias_delete_negocio" ON public.categorias_cliente FOR DELETE TO authenticated USING (negocio_id = get_user_negocio_id(auth.uid()));

-- Políticas para productos
CREATE POLICY "productos_select_negocio" ON public.productos FOR SELECT TO authenticated USING (negocio_id = get_user_negocio_id(auth.uid()));
CREATE POLICY "productos_insert_negocio" ON public.productos FOR INSERT TO authenticated WITH CHECK (negocio_id = get_user_negocio_id(auth.uid()));
CREATE POLICY "productos_update_negocio" ON public.productos FOR UPDATE TO authenticated USING (negocio_id = get_user_negocio_id(auth.uid())) WITH CHECK (negocio_id = get_user_negocio_id(auth.uid()));
CREATE POLICY "productos_delete_negocio" ON public.productos FOR DELETE TO authenticated USING (negocio_id = get_user_negocio_id(auth.uid()));

-- Triggers de updated_at para las nuevas tablas
CREATE TRIGGER update_categorias_updated_at BEFORE UPDATE ON categorias_cliente FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_productos_updated_at BEFORE UPDATE ON productos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers para setear tenant automáticamente
CREATE TRIGGER set_categorias_tenant_fields BEFORE INSERT ON categorias_cliente FOR EACH ROW EXECUTE FUNCTION set_tenant_fields();
CREATE TRIGGER set_productos_tenant_fields BEFORE INSERT ON productos FOR EACH ROW EXECUTE FUNCTION set_tenant_fields();


-- =====================================================
-- 3. MIGRAR VISTA Y TABLAS DEPENDIENTES (DROP TEMPORAL)
-- =====================================================
-- Como cambiamos columnas, tenemos que rehacer la vista

DROP VIEW IF EXISTS public.vista_metricas_clientes;

-- =====================================================
-- 4. ADAPTAR TABLA CLIENTES (Genérica)
-- =====================================================

-- Añadir el ID de la nueva categoría (FK) temporalmente nullable
ALTER TABLE public.clientes ADD COLUMN categoria_id UUID REFERENCES public.categorias_cliente(id) ON DELETE SET NULL;

-- El campo tipo_negocio_enum antiguo por ahora lo mantenemos para no romper datos existentes, 
-- pero añadimos la columna nueva. Si quieres, lo borramos luego.

-- =====================================================
-- 5. ADAPTAR TABLA VISITAS (Genérica)
-- =====================================================

-- Rename de columnas restrictivas a nombres genéricos
ALTER TABLE public.visitas RENAME COLUMN kilos_vendidos TO cantidad;
ALTER TABLE public.visitas RENAME COLUMN precio_kilo_aplicado TO precio_unitario;

-- Añadir el ID del producto (FK)
ALTER TABLE public.visitas ADD COLUMN producto_id UUID REFERENCES public.productos(id) ON DELETE SET NULL;


-- =====================================================
-- 6. RECREAR LA VISTA MAESTRA CON LOS NUEVOS NOMBRES
-- =====================================================

CREATE OR REPLACE VIEW public.vista_metricas_clientes AS
SELECT
  c.id,
  c.negocio_id,
  c.user_id,
  c.nombre,
  -- Devolvemos ambas temporalmente para retrocompatibilidad
  c.tipo_negocio, 
  c.categoria_id,
  cat.nombre as categoria_nombre,
  c.celular,
  c.precio_sugerido,
  c.latitud,
  c.longitud,
  c.activo,
  
  -- Total cantidad comprada (suma de todas las ventas)
  COALESCE(SUM(
    CASE 
      WHEN v.resultado = 'Venta' THEN v.cantidad
      ELSE 0
    END
  ), 0) AS total_kilos_comprados, -- Mantengo el alias por retrocompatibilidad del frontend
  
  -- Deuda pendiente
  COALESCE(SUM(
    CASE 
      WHEN v.resultado IN ('Venta', 'Abono') 
      THEN COALESCE(v.monto_total, 0) - COALESCE(v.monto_pagado, 0)
      ELSE 0
    END
  ), 0) AS deuda_pendiente,
  
  -- Última fecha de compra
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

FROM public.clientes c
LEFT JOIN public.visitas v ON c.id = v.cliente_id
LEFT JOIN public.categorias_cliente cat ON c.categoria_id = cat.id
GROUP BY 
  c.id, c.negocio_id, c.user_id, c.nombre, c.tipo_negocio, c.categoria_id, cat.nombre, 
  c.celular, c.precio_sugerido, c.latitud, c.longitud, c.activo;

-- =====================================================
-- 7. NOTA POST-MIGRACIÓN
-- =====================================================
-- Para el frontend, cambiarás progresivamente "kilos_vendidos" por "cantidad".
-- Una vez el UI use "categoria_id" y "producto_id", puedes ejecutar:
-- ALTER TABLE clientes DROP COLUMN tipo_negocio;
-- ALTER TABLE visitas DROP COLUMN tipo_trapo;
-- DROP TYPE tipo_negocio_enum;
-- DROP TYPE tipo_trapo_enum;