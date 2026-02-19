'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Step = 'login' | 'selectNegocio';

interface Negocio {
  id: string;
  nombre: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [negocioSeleccionado, setNegocioSeleccionado] = useState('');
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Manejar tokens de autenticación en la URL (enlaces de recuperación, magic links, etc.)
  useEffect(() => {
    const checkAuthToken = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');

      if (accessToken && type) {
        setLoading(true);
        try {
          // Obtener sesión del usuario
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError) throw userError;
          
          if (user) {
            // Limpiar el hash de la URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Verificar si tiene negocio asignado
            const { data: usuarioNegocio, error: checkError } = await supabase
              .from('usuarios_negocio')
              .select('negocio_id')
              .eq('user_id', user.id)
              .eq('activo', true)
              .single();

            if (checkError && checkError.code !== 'PGRST116') {
              throw checkError;
            }

            if (usuarioNegocio) {
              router.push('/');
              return;
            }

            // Cargar negocios para selección
            const { data: negociosData, error: negociosError } = await supabase
              .from('negocios')
              .select('id, nombre')
              .eq('activo', true)
              .order('nombre');

            if (negociosError) throw negociosError;

            setNegocios(negociosData || []);
            setStep('selectNegocio');
          }
        } catch (err: any) {
          setError(err.message || 'Error al procesar autenticación');
        } finally {
          setLoading(false);
        }
      }
    };

    checkAuthToken();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Iniciando autenticación...');
      
      // 1. Autenticar con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('❌ Error de autenticación:', authError);
        // Mejorar mensajes de error
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Correo o contraseña incorrectos. Verifica tus credenciales.');
        } else if (authError.message.includes('Email not confirmed')) {
          throw new Error('Por favor verifica tu correo antes de iniciar sesión.');
        } else {
          throw new Error(`Error de autenticación: ${authError.message}`);
        }
      }

      if (!authData.user) {
        throw new Error('No se pudo obtener el usuario');
      }

      console.log('✅ Usuario autenticado:', authData.user.id);

      // 2. Verificar si el usuario ya está asociado a un negocio
      console.log('🔍 Verificando asociación a negocio...');
      const { data: usuarioNegocio, error: checkError } = await supabase
        .from('usuarios_negocio')
        .select('negocio_id, negocio:negocios(nombre)')
        .eq('user_id', authData.user.id)
        .eq('activo', true)
        .single();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          // No hay registro - es primera vez
          console.log('ℹ️ Usuario nuevo - necesita seleccionar negocio');
        } else {
          console.error('❌ Error al verificar negocio:', checkError);
          throw checkError;
        }
      }

      // 3. Si ya tiene negocio asignado, redirigir al home
      if (usuarioNegocio) {
        console.log('✅ Usuario ya tiene negocio asignado:', usuarioNegocio);
        router.push('/');
        router.refresh();
        return;
      }

      // 4. Si no tiene negocio, cargar lista de negocios
      console.log('📋 Cargando lista de negocios...');
      const { data: negociosData, error: negociosError } = await supabase
        .from('negocios')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');

      if (negociosError) {
        console.error('❌ Error al cargar negocios:', negociosError);
        throw negociosError;
      }

      console.log('✅ Negocios cargados:', negociosData?.length || 0);
      
      if (!negociosData || negociosData.length === 0) {
        throw new Error('No hay negocios disponibles. Contacta al administrador.');
      }

      setNegocios(negociosData || []);
      setStep('selectNegocio');
    } catch (err: any) {
      console.error('❌ Login error:', err);
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectNegocio = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔗 Asociando usuario a negocio...');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Usuario no autenticado');
      if (!user.email) throw new Error('Usuario sin email');

      console.log('👤 Usuario:', user.id);
      console.log('🏢 Negocio:', negocioSeleccionado);
      console.log('📝 Nombre:', nombreUsuario);

      // Crear la asociación usuario-negocio
      const { error: insertError } = await supabase
        .from('usuarios_negocio')
        .insert({
          user_id: user.id,
          negocio_id: negocioSeleccionado,
          nombre: nombreUsuario,
          email: user.email,
          rol: 'vendedor',
          activo: true,
        });

      if (insertError) {
        console.error('❌ Error al insertar:', insertError);
        throw insertError;
      }

      console.log('✅ Usuario asociado exitosamente');

      // Redirigir al home
      router.push('/');
      router.refresh();
    } catch (err: any) {
      console.error('❌ Error al asociar negocio:', err);
      setError(err.message || 'Error al asociar negocio');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'selectNegocio') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
            Selecciona tu Negocio
          </h1>
          <p className="text-gray-600 mb-6 text-center text-sm">
            Elige el negocio al que perteneces
          </p>

          <form onSubmit={handleSelectNegocio} className="space-y-4">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                Tu Nombre
              </label>
              <input
                id="nombre"
                type="text"
                value={nombreUsuario}
                onChange={(e) => setNombreUsuario(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Juan Pérez"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="negocio" className="block text-sm font-medium text-gray-700 mb-1">
                Negocio
              </label>
              <select
                id="negocio"
                value={negocioSeleccionado}
                onChange={(e) => setNegocioSeleccionado(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="">Selecciona un negocio...</option>
                {negocios.map((negocio) => (
                  <option key={negocio.id} value={negocio.id}>
                    {negocio.nombre}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !negocioSeleccionado || !nombreUsuario}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : 'Continuar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            TrapoApp
          </h1>
          <p className="text-gray-600">Gestión de ventas en ruta</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="tu@email.com"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          ¿Problemas para acceder? Contacta al administrador
        </p>
      </div>
    </div>
  );
}
