'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Filter, ArrowUpDown, History } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { MetricasCliente, TipoNegocio } from '@/types';
import { formatearMoneda, formatearDias, generarEnlaceWhatsApp } from '@/lib/utils';
import { useRouter } from 'next/navigation';

type OrdenPor = 'nombre' | 'dias_desde_ultima_compra' | 'deuda_pendiente';

export default function DirectorioPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<MetricasCliente[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<MetricasCliente[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [cargando, setCargando] = useState(true);
  
  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<TipoNegocio | 'Todos'>('Todos');
  const [ordenPor, setOrdenPor] = useState<OrdenPor>('nombre');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  useEffect(() => {
    cargarClientes();
  }, []);

  useEffect(() => {
    aplicarFiltrosYOrden();
  }, [clientes, filtroTipo, ordenPor]);

  const cargarClientes = async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from('vista_metricas_clientes')
        .select('*')
        .eq('activo', true);

      if (error) throw error;
      setClientes((data as MetricasCliente[]) || []);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      alert('Error al cargar los clientes');
    } finally {
      setCargando(false);
    }
  };

  const aplicarFiltrosYOrden = () => {
    let resultado = [...clientes];

    // Aplicar filtro por tipo
    if (filtroTipo !== 'Todos') {
      resultado = resultado.filter((c) => (c.categoria_nombre || 'Sin categoría') === filtroTipo);
    }

    // Aplicar ordenamiento
    resultado.sort((a, b) => {
      switch (ordenPor) {
        case 'dias_desde_ultima_compra':
          const diasA = a.dias_desde_ultima_compra ?? 9999;
          const diasB = b.dias_desde_ultima_compra ?? 9999;
          return diasB - diasA; // Mayor a menor (más días primero)
        case 'deuda_pendiente':
          return b.deuda_pendiente - a.deuda_pendiente; // Mayor a menor
        case 'nombre':
        default:
          return a.nombre.localeCompare(b.nombre);
      }
    });

    setClientesFiltrados(resultado);
  };

  const toggleSeleccion = (id: string) => {
    const nuevaSeleccion = new Set(seleccionados);
    if (nuevaSeleccion.has(id)) {
      nuevaSeleccion.delete(id);
    } else {
      nuevaSeleccion.add(id);
    }
    setSeleccionados(nuevaSeleccion);
  };

  const enviarWhatsApp = () => {
    const clientesSeleccionados = clientes.filter((c) =>
      seleccionados.has(c.id)
    );

    if (clientesSeleccionados.length === 0) {
      alert('Selecciona al menos un cliente');
      return;
    }

    const mensaje = '¡Hola! Paso a ofrecerte trapos industriales de calidad. ¿Te interesan?';

    clientesSeleccionados.forEach((cliente, index) => {
      const enlace = generarEnlaceWhatsApp(cliente.celular, mensaje);
      // Pequeño delay entre ventanas para evitar bloqueo del navegador
      setTimeout(() => {
        window.open(enlace, '_blank');
      }, index * 500);
    });

    // Limpiar selección después de enviar
    setSeleccionados(new Set());
  };

  const tiposNegocio: Array<TipoNegocio | 'Todos'> = [
    'Todos',
    'Mecánico',
    'Torno',
    'Rectificadora',
    'Hojalatería',
    'Otro',
  ];

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-600 text-lg font-medium">Cargando clientes...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-gray-900">Directorio CRM</h1>
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
          >
            <Filter className="w-6 h-6" />
          </button>
        </div>

        {/* Panel de filtros */}
        {mostrarFiltros && (
          <div className="space-y-3 pt-3 border-t border-gray-200">
            {/* Filtro por tipo */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Tipo de negocio</p>
              <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                {tiposNegocio.map((tipo) => (
                  <button
                    key={tipo}
                    onClick={() => setFiltroTipo(tipo)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      filtroTipo === tipo
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                    }`}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
            </div>

            {/* Ordenamiento */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Ordenar por</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setOrdenPor('nombre')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 ${
                    ordenPor === 'nombre'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <ArrowUpDown className="w-4 h-4" />
                  Nombre
                </button>
                <button
                  onClick={() => setOrdenPor('dias_desde_ultima_compra')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 ${
                    ordenPor === 'dias_desde_ultima_compra'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <ArrowUpDown className="w-4 h-4" />
                  Días sin compra
                </button>
                <button
                  onClick={() => setOrdenPor('deuda_pendiente')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 ${
                    ordenPor === 'deuda_pendiente'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <ArrowUpDown className="w-4 h-4" />
                  Deuda
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contador */}
        <p className="text-sm text-gray-600 mt-3">
          {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? 's' : ''}
          {seleccionados.size > 0 && ` • ${seleccionados.size} seleccionado${seleccionados.size !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Lista de clientes */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {clientesFiltrados.length === 0 ? (
          <div className="flex items-center justify-center h-full p-6">
            <p className="text-gray-600">No hay clientes que mostrar</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {clientesFiltrados.map((cliente) => {
              const isSeleccionado = seleccionados.has(cliente.id);

              return (
                <div
                  key={cliente.id}
                  onClick={() => toggleSeleccion(cliente.id)}
                  className={`bg-white rounded-lg shadow-sm border-2 p-4 active:scale-98 transition-all cursor-pointer ${
                    isSeleccionado
                      ? 'border-primary-600 ring-2 ring-primary-200'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center mt-0.5 ${
                      isSeleccionado
                        ? 'bg-primary-600 border-primary-600'
                        : 'border-gray-300'
                    }`}>
                      {isSeleccionado && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Información del cliente */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="truncate pr-2">
                          <h3 className="text-base font-bold text-gray-900 truncate">
                            {cliente.nombre}
                          </h3>
                          <p className="text-sm text-gray-600">{cliente.categoria_nombre || 'Sin categoría'}</p>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/historial?cliente_id=${cliente.id}`);
                          }}
                          className="flex-shrink-0 p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors shadow-sm active:scale-95"
                          title="Ver historial de cliente"
                        >
                          <History className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                        <div>
                          <p className="text-xs text-gray-600">Precio</p>
                          <p className="text-sm font-bold text-gray-900">
                            {formatearMoneda(cliente.precio_sugerido)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Deuda</p>
                          <p className={`text-sm font-bold ${
                            cliente.deuda_pendiente > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {formatearMoneda(cliente.deuda_pendiente)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Última compra</p>
                          <p className="text-sm font-bold text-gray-900">
                            {formatearDias(cliente.dias_desde_ultima_compra)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB - Botón para WhatsApp */}
      {seleccionados.size > 0 && (
        <button
          onClick={enviarWhatsApp}
          className="fab w-14 h-14 bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Enviar WhatsApp"
        >
          <MessageCircle className="w-7 h-7" />
        </button>
      )}
    </div>
  );
}
