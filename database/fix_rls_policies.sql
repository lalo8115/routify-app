-- =====================================================
-- FIX: Políticas RLS correctas sin recursión infinita
-- =====================================================
-- Ejecuta este script en Supabase SQL Editor

-- 1. ELIMINAR POLÍTICAS EXISTENTES
-- =====================================================

DROP POLICY IF EXISTS "Usuarios ven su propio negocio" ON negocios;
DROP POLICY IF EXISTS "Usuarios ven compañeros de su negocio" ON usuarios_negocio;
DROP POLICY IF EXISTS "Usuarios ven todos los clientes de su negocio" ON clientes;
DROP POLICY IF EXISTS "Usuarios pueden insertar clientes" ON clientes;
DROP POLICY IF EXISTS "Usuarios pueden actualizar clientes" ON clientes;
DROP POLICY IF EXISTS "Usuarios pueden eliminar clientes" ON clientes;
DROP POLICY IF EXISTS "Usuarios ven visitas de su negocio" ON visitas;
DROP POLICY IF EXISTS "Usuarios pueden insertar visitas" ON visitas;
DROP POLICY IF EXISTS "Usuarios pueden actualizar visitas" ON visitas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver clientes" ON clientes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar clientes" ON clientes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar clientes" ON clientes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar clientes" ON clientes;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver visitas" ON visitas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden insertar visitas" ON visitas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar visitas" ON visitas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar visitas" ON visitas;

-- 2. CREAR FUNCIÓN HELPER PARA OBTENER NEGOCIO DEL USUARIO
-- =====================================================
-- Esta función evita la recursión al no usar políticas RLS internamente

CREATE OR REPLACE FUNCTION get_user_negocio_id(user_uuid UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT negocio_id 
  FROM usuarios_negocio 
  WHERE user_id = user_uuid 
    AND activo = true 
  LIMIT 1;
$$;

-- 3. HABILITAR RLS EN TODAS LAS TABLAS
-- =====================================================

ALTER TABLE negocios ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitas ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS PARA NEGOCIOS
-- =====================================================
-- Todos los usuarios autenticados pueden ver negocios activos (necesario para selector en login)

CREATE POLICY "negocios_select_activos"
  ON negocios FOR SELECT
  TO authenticated
  USING (activo = true);

-- 5. POLÍTICAS PARA USUARIOS_NEGOCIO
-- =====================================================

-- Los usuarios pueden ver SU PROPIO registro (necesario para login)
CREATE POLICY "usuarios_negocio_select_propio"
  ON usuarios_negocio FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Los usuarios pueden crear SU PROPIO registro (primera vez que inician sesión)
CREATE POLICY "usuarios_negocio_insert_propio"
  ON usuarios_negocio FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Los usuarios pueden ver a otros usuarios de SU MISMO negocio
CREATE POLICY "usuarios_negocio_select_companeros"
  ON usuarios_negocio FOR SELECT
  TO authenticated
  USING (negocio_id = get_user_negocio_id(auth.uid()));

-- 6. POLÍTICAS PARA CLIENTES
-- =====================================================

-- SELECT: Ver solo clientes de su negocio
CREATE POLICY "clientes_select_negocio"
  ON clientes FOR SELECT
  TO authenticated
  USING (negocio_id = get_user_negocio_id(auth.uid()));

-- INSERT: Crear clientes en su negocio
CREATE POLICY "clientes_insert_negocio"
  ON clientes FOR INSERT
  TO authenticated
  WITH CHECK (
    negocio_id = get_user_negocio_id(auth.uid())
    AND user_id = auth.uid()
  );

-- UPDATE: Actualizar clientes de su negocio
CREATE POLICY "clientes_update_negocio"
  ON clientes FOR UPDATE
  TO authenticated
  USING (negocio_id = get_user_negocio_id(auth.uid()))
  WITH CHECK (negocio_id = get_user_negocio_id(auth.uid()));

-- DELETE: Eliminar clientes de su negocio
CREATE POLICY "clientes_delete_negocio"
  ON clientes FOR DELETE
  TO authenticated
  USING (negocio_id = get_user_negocio_id(auth.uid()));

-- 7. POLÍTICAS PARA VISITAS
-- =====================================================

-- SELECT: Ver solo visitas de su negocio
CREATE POLICY "visitas_select_negocio"
  ON visitas FOR SELECT
  TO authenticated
  USING (negocio_id = get_user_negocio_id(auth.uid()));

-- INSERT: Crear visitas en su negocio
CREATE POLICY "visitas_insert_negocio"
  ON visitas FOR INSERT
  TO authenticated
  WITH CHECK (
    negocio_id = get_user_negocio_id(auth.uid())
    AND user_id = auth.uid()
  );

-- UPDATE: Actualizar visitas de su negocio
CREATE POLICY "visitas_update_negocio"
  ON visitas FOR UPDATE
  TO authenticated
  USING (negocio_id = get_user_negocio_id(auth.uid()))
  WITH CHECK (negocio_id = get_user_negocio_id(auth.uid()));

-- DELETE: Eliminar visitas de su negocio
CREATE POLICY "visitas_delete_negocio"
  ON visitas FOR DELETE
  TO authenticated
  USING (negocio_id = get_user_negocio_id(auth.uid()));

-- =====================================================
-- 8. NOTAS IMPORTANTES
-- =====================================================
-- 
-- SEGURIDAD IMPLEMENTADA:
-- ✅ Los usuarios solo ven negocios activos
-- ✅ Los usuarios solo ven su propio registro en usuarios_negocio
-- ✅ Los usuarios solo pueden crear su propio registro (primera vez)
-- ✅ Los usuarios ven compañeros del mismo negocio
-- ✅ Los usuarios solo acceden a clientes/visitas de su negocio
-- ✅ No hay recursión infinita usando SECURITY DEFINER
--
-- FLUJO DE PRIMER LOGIN:
-- 1. Usuario se autentica con email/password
-- 2. NO tiene registro en usuarios_negocio → puede consultar negocios activos
-- 3. Selecciona su negocio → crea registro en usuarios_negocio
-- 4. Desde ese momento, solo ve datos de su negocio
--
-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

-- Verifica las políticas ejecutando:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, policyname;
