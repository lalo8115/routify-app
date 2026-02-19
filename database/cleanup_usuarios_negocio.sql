-- =====================================================
-- SCRIPT DE LIMPIEZA: Resetear usuarios_negocio para pruebas
-- =====================================================
-- Ejecuta este script para limpiar las asociaciones existentes
-- y poder probar el flujo de primer login nuevamente

-- 1. VER REGISTROS ACTUALES
-- =====================================================

-- Ver todos los registros en usuarios_negocio
SELECT 
  un.id,
  un.user_id,
  un.nombre,
  un.email,
  un.rol,
  n.nombre as negocio_nombre,
  un.activo,
  un.created_at
FROM usuarios_negocio un
LEFT JOIN negocios n ON un.negocio_id = n.id
ORDER BY un.created_at DESC;

-- 2. ELIMINAR TODAS LAS ASOCIACIONES (OPCIONAL - SOLO PARA TESTING)
-- =====================================================
-- ⚠️ CUIDADO: Esto eliminará TODAS las asociaciones de usuarios a negocios
-- Descomenta la siguiente línea solo si quieres resetear completamente:

-- DELETE FROM usuarios_negocio;

-- 3. ELIMINAR ASOCIACIÓN DE UN USUARIO ESPECÍFICO
-- =====================================================
-- Si solo quieres eliminar la asociación de un usuario en particular
-- (para que vuelva a ver el selector de negocios en su próximo login):

-- Reemplaza 'USER-ID-AQUI' con el ID del usuario que quieres resetear
-- DELETE FROM usuarios_negocio WHERE user_id = 'USER-ID-AQUI';

-- 4. VERIFICAR QUE LOS NEGOCIOS EXISTEN
-- =====================================================

SELECT id, nombre, activo, created_at
FROM negocios
ORDER BY nombre;

-- Si no hay negocios, crea uno:
-- INSERT INTO negocios (id, nombre, descripcion, activo) VALUES
-- ('00000000-0000-0000-0000-000000000000', 'Mi Distribuidora', 'Negocio principal', true);

-- 5. VER USUARIOS DE AUTH
-- =====================================================
-- Para ver qué usuarios existen en Supabase Auth:
-- (Ejecuta esto desde el panel de Authentication → Users en Supabase Dashboard)

-- 6. NOTAS IMPORTANTES
-- =====================================================
--
-- FLUJO ESPERADO DESPUÉS DE EJECUTAR ESTE SCRIPT:
-- 1. Usuario inicia sesión con email/password
-- 2. Sistema verifica usuarios_negocio → NO encuentra registro
-- 3. Sistema muestra selector de negocios
-- 4. Usuario selecciona negocio e ingresa su nombre
-- 5. Sistema crea registro en usuarios_negocio
-- 6. Desde ese momento, el usuario está asociado permanentemente
--
-- PARA PROBAR NUEVAMENTE EL FLUJO:
-- 1. Elimina el registro del usuario en usuarios_negocio
-- 2. Limpia storage del navegador (http://localhost:3000/clear-storage)
-- 3. Inicia sesión nuevamente
--
-- =====================================================
