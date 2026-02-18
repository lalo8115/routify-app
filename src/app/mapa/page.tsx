'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { MetricasCliente } from '@/types';

// Importar MapView de forma dinámica para evitar problemas con SSR
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100">
      <p className="text-gray-600 text-lg font-medium">Cargando mapa...</p>
    </div>
  ),
});

export default function MapaPage() {
  const [clientes, setClientes] = useState<MetricasCliente[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from('vista_metricas_clientes')
        .select('*')
        .eq('activo', true);

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      alert('Error al cargar los clientes');
    } finally {
      setCargando(false);
    }
  };

  const handleVisitaRegistrada = () => {
    cargarClientes();
  };

  return (
    <div className="h-full">
      {!cargando && (
        <MapView 
          clientes={clientes} 
          onVisitaRegistrada={handleVisitaRegistrada}
        />
      )}
    </div>
  );
}
