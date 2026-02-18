'use client';

import { useEffect, useState } from 'react';
import { Plus, Navigation } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ClienteConDistancia, Coordenadas } from '@/types';
import { calcularDistancia, obtenerUbicacionActual } from '@/lib/utils';
import ClienteCard from '@/components/ClienteCard';
import NuevoClienteModal from '@/components/NuevoClienteModal';

export default function HomePage() {
  const [clientes, setClientes] = useState<ClienteConDistancia[]>([]);
  const [ubicacionActual, setUbicacionActual] = useState<Coordenadas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError(null);

      // Obtener ubicación actual
      const ubicacion = await obtenerUbicacionActual();
      setUbicacionActual(ubicacion);

      // Cargar clientes desde la vista con métricas
      const { data, error } = await supabase
        .from('vista_metricas_clientes')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;

      // Calcular distancia para cada cliente
      const clientesConDistancia = data.map((cliente) => ({
        ...cliente,
        distancia: calcularDistancia(ubicacion, {
          latitud: cliente.latitud,
          longitud: cliente.longitud,
        }),
      }));

      // Ordenar por distancia
      clientesConDistancia.sort((a, b) => (a.distancia ?? 0) - (b.distancia ?? 0));

      setClientes(clientesConDistancia);
    } catch (err: any) {
      console.error('Error al cargar datos:', err);
      setError(err.message || 'Error al cargar los datos');
    } finally {
      setCargando(false);
    }
  };

  const handleClienteCreado = () => {
    setMostrarNuevoCliente(false);
    cargarDatos();
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Navigation className="w-12 h-12 text-primary-600 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium">Obteniendo ubicación...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center">
          <p className="text-red-600 text-lg font-medium mb-4">Error: {error}</p>
          <button
            onClick={cargarDatos}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Captura Rápida</h1>
        {ubicacionActual && (
          <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
            <Navigation className="w-4 h-4" />
            Clientes ordenados por distancia
          </p>
        )}
      </div>

      {/* Lista de clientes */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {clientes.length === 0 ? (
          <div className="flex items-center justify-center h-full p-6">
            <div className="text-center">
              <p className="text-gray-600 text-lg mb-4">No hay clientes registrados</p>
              <button
                onClick={() => setMostrarNuevoCliente(true)}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium"
              >
                Crear primer cliente
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {clientes.map((cliente) => (
              <ClienteCard
                key={cliente.id}
                cliente={cliente}
                onVentaRegistrada={cargarDatos}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB - Botón flotante para nuevo cliente */}
      <button
        onClick={() => setMostrarNuevoCliente(true)}
        className="fab w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Crear nuevo cliente"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Modal para nuevo cliente */}
      {mostrarNuevoCliente && (
        <NuevoClienteModal
          ubicacionActual={ubicacionActual}
          onClose={() => setMostrarNuevoCliente(false)}
          onClienteCreado={handleClienteCreado}
        />
      )}
    </div>
  );
}
