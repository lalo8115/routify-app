'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { ShoppingCart, XCircle, Banknote, Calendar, Clock, MapPin, ArrowLeft } from 'lucide-react';
import { formatearMoneda } from '@/lib/utils';
import BottomNav from '@/components/BottomNav';
import { useSearchParams, useRouter } from 'next/navigation';

interface VisitaHistory {
  id: string;
  cliente_id: string;
  resultado: string;
  fecha: string;
  monto_total: number | null;
  monto_pagado: number | null;
  cantidad: number | null;
  notas: string | null;
  cliente: {
    nombre: string;
  };
    producto?: {
      nombre: string;
      unidad_medida?: string;
    };
}

function HistorialContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clienteId = searchParams.get('cliente_id');
  
  const [visitas, setVisitas] = useState<VisitaHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>('Todas');

  useEffect(() => {
    cargarHistorial();
  }, [clienteId]);

  const cargarHistorial = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('visitas')
        .select('*, cliente:clientes(nombre), producto:productos(nombre, unidad_medida)')
        .order('fecha', { ascending: false })
        .limit(100);

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (data) setVisitas(data as unknown as VisitaHistory[]);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredVisitas = () => {
    if (filtro === 'Todas') return visitas;
    return visitas.filter(v => v.resultado === filtro);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('es-MX', { 
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
    }).format(d);
  };

  const getIcon = (resultado: string) => {
    switch (resultado) {
      case 'Venta': return <ShoppingCart className="w-5 h-5 text-green-500" />;
      case 'Abono': return <Banknote className="w-5 h-5 text-blue-500" />;
      case 'No_Venta': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getColorClass = (resultado: string) => {
    switch (resultado) {
      case 'Venta': return 'bg-green-50 border-green-100';
      case 'Abono': return 'bg-blue-50 border-blue-100';
      case 'No_Venta': return 'bg-red-50 border-red-100';
      default: return 'bg-gray-50 border-gray-100';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b sticky top-0 z-10">
          <div className="p-4 flex items-center gap-3">
            {clienteId && (
              <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <h1 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <Clock className="w-6 h-6 text-indigo-600" />
              Historial {clienteId ? 'del Cliente' : 'de Actividad'}
            </h1>
          </div>
        
        {/* Filtros */}
        <div className="flex px-4 pb-3 gap-2 overflow-x-auto shrink-0 no-scrollbar">
          {['Todas', 'Venta', 'No_Venta', 'Abono'].map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filtro === f 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="text-center py-10 text-gray-500 animate-pulse">Cargando historial...</div>
        ) : getFilteredVisitas().length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No hay interacciones registradas</p>
          </div>
        ) : (
          getFilteredVisitas().map((visita) => (
            <div 
              key={visita.id} 
              className={`p-4 rounded-xl border flex flex-col gap-2 shadow-sm ${getColorClass(visita.resultado)}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    {getIcon(visita.resultado)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 truncate max-w-[200px]">
                      {visita.cliente?.nombre || 'Cliente Desconocido'}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(visita.fecha)}
                    </p>
                  </div>
                </div>
                
                {visita.resultado === 'Venta' && (
                  <div className="text-right">
                    <span className="block font-bold text-green-700">
                      {formatearMoneda(visita.monto_total || 0)}
                    </span>
                    {visita.cantidad && (
                      <span className="text-xs text-green-600 font-medium bg-green-100 px-2 py-0.5 rounded-full">
                          {visita.cantidad} {visita.producto?.unidad_medida ? visita.producto.unidad_medida : 'u.'}{visita.producto?.nombre ? ' de ' + visita.producto.nombre : ''}
                      </span>
                    )}
                  </div>
                )}
                {visita.resultado === 'Abono' && (
                  <div className="text-right">
                    <span className="block font-bold text-blue-700">
                      {formatearMoneda(visita.monto_pagado || 0)}
                    </span>
                    <span className="text-xs text-blue-600 font-medium">Abono</span>
                  </div>
                )}
                {visita.resultado === 'No_Venta' && (
                  <div className="text-right">
                    <span className="block font-semibold text-red-600 text-sm">
                      Rechazo
                    </span>
                  </div>
                )}
              </div>
              
              {visita.notas && (
                <div className="mt-1 text-sm text-gray-600 bg-white/50 p-2 rounded relative before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-gray-300 before:rounded-l overflow-hidden">
                  <span className="italic pl-2 block">"{visita.notas}"</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}

export default function HistorialPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Cargando...</div>}>
      <HistorialContent />
    </Suspense>
  );
}
