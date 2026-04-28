'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { LocateFixed, Plus, Search, MapPin, Navigation, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ClienteConDistancia, Coordenadas, MetricasCliente } from '@/types';
import { calcularDistancia, obtenerUbicacionActual } from '@/lib/utils';
import ClienteCard from '@/components/ClienteCard';
import NuevoClienteModal from '@/components/NuevoClienteModal';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-slate-100">
      <p className="text-slate-600 text-sm font-medium">Cargando mapa...</p>
    </div>
  ),
});

type SearchResult =
  | {
      type: 'cliente';
      id: string;
      title: string;
      subtitle: string;
      cliente: ClienteConDistancia;
    }
  | {
      type: 'direccion';
      id: string;
      title: string;
      subtitle: string;
      coords: Coordenadas;
    };

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

export default function MapaInicioUnificado() {
  const [clientes, setClientes] = useState<ClienteConDistancia[]>([]);
  const [ubicacionActual, setUbicacionActual] = useState<Coordenadas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<ClienteConDistancia | null>(null);
  const [focusLocation, setFocusLocation] = useState<Coordenadas | null>(null);
  const [newLocationPin, setNewLocationPin] = useState<Coordenadas | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();

    if (!query) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    let active = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setSearching(true);

      const normalized = query.toLowerCase();
      const localResults: SearchResult[] = clientes
        .filter((cliente) => cliente.nombre.toLowerCase().includes(normalized))
        .slice(0, 5)
        .map((cliente) => ({
          type: 'cliente',
          id: `cliente-${cliente.id}`,
          title: cliente.nombre,
          subtitle: `${cliente.tipo_negocio} • ${cliente.distancia !== undefined ? `${cliente.distancia.toFixed(2)} km` : 'sin distancia'}`,
          cliente,
        }));

      let remoteResults: SearchResult[] = [];

      if (query.length >= 3) {
        try {
          // Crear un área de búsqueda (bounding box de ~100x100km) basada en la ubicación del usuario
          const lat = ubicacionActual?.latitud || 25.6866;
          const lon = ubicacionActual?.longitud || -100.3161;
          const viewbox = `${lon - 0.5},${lat + 0.5},${lon + 0.5},${lat - 0.5}`;

          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=mx&viewbox=${viewbox}&bounded=1&q=${encodeURIComponent(query)}`,
            {
              signal: controller.signal,
              headers: {
                Accept: 'application/json',
              },
            }
          );

          if (response.ok) {
            const data = (await response.json()) as NominatimResult[];
            remoteResults = data.map((item) => ({
              type: 'direccion',
              id: `direccion-${item.place_id}`,
              title: item.display_name.split(',')[0] ?? item.display_name,
              subtitle: item.display_name,
              coords: {
                latitud: Number(item.lat),
                longitud: Number(item.lon),
              },
            }));
          }
        } catch (fetchError) {
          if (!(fetchError instanceof DOMException && fetchError.name === 'AbortError')) {
            console.warn('No fue posible consultar sugerencias externas:', fetchError);
          }
        }
      }

      if (!active) {
        return;
      }

      setSearchResults([...localResults, ...remoteResults].slice(0, 8));
      setSearching(false);
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchQuery, clientes]);

  useEffect(() => {
    if (!selectedCliente || !listRef.current) {
      return;
    }

    const card = document.getElementById(`cliente-${selectedCliente.id}`);
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectedCliente]);

  const clientesFiltrados = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return clientes;
    }

    return clientes.filter((cliente) => {
      return (
        cliente.nombre.toLowerCase().includes(query) ||
        cliente.tipo_negocio.toLowerCase().includes(query)
      );
    });
  }, [clientes, searchQuery]);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      setError(null);

      const ubicacionPromise = obtenerUbicacionActual().then(
        (ubicacion) => {
          setUbicacionActual(ubicacion);
          setGeoStatus('ok');
          return ubicacion;
        },
        (geoError) => {
          console.warn('Ubicación no disponible:', geoError);
          setUbicacionActual(null);
          setGeoStatus('error');
          return null;
        }
      );

      const [ubicacion, clientesResult, visitasResult] = await Promise.all([
        ubicacionPromise,
        supabase
          .from('vista_metricas_clientes')
          .select('*')
          .eq('activo', true)
          .order('nombre'),
        supabase
          .from('visitas')
          .select('cliente_id, cantidad, monto_total')
          .eq('resultado', 'Venta')
          .order('fecha', { ascending: false })
      ]);

      const { data, error: clientesError } = clientesResult;
      const { data: visitasData, error: visitasError } = visitasResult;

      if (clientesError) {
        throw clientesError;
      }
      if (visitasError) {
        console.warn('No se pudieron cargar las visitas recientes:', visitasError);
      }

      // Mapear la última visita por cliente
      const ultimaVisitaMap = new Map<string, { cantidad: number, monto: number }>();
      (visitasData || []).forEach((visita: any) => {
        if (!ultimaVisitaMap.has(visita.cliente_id)) {
          ultimaVisitaMap.set(visita.cliente_id, {
            cantidad: visita.cantidad || 0,
            monto: visita.monto_total || 0
          });
        }
      });

      const clientesConDistancia = (data || []).map((cliente: MetricasCliente) => {
        const ultVisita = ultimaVisitaMap.get(cliente.id);
        return {
          ...cliente,
          ultima_cantidad: ultVisita?.cantidad,
          ultimo_monto: ultVisita?.monto,
          distancia: ubicacion
            ? calcularDistancia(ubicacion, {
                latitud: cliente.latitud,
                longitud: cliente.longitud,
              })
            : undefined,
        };
      });

      clientesConDistancia.sort((a: any, b: any) => {
        if (a.distancia !== undefined && b.distancia !== undefined) {
          return a.distancia - b.distancia;
        }

        if (a.distancia !== undefined) return -1;
        if (b.distancia !== undefined) return 1;
        return a.nombre.localeCompare(b.nombre);
      });

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

  const handleSelectResult = (result: SearchResult) => {
    setSearchResults([]);

    if (result.type === 'cliente') {
      setSearchQuery(result.title);
      setSelectedCliente(result.cliente);
      setFocusLocation(null);
      return;
    }

    setSearchQuery('');
    setSelectedCliente(null);
    setFocusLocation(result.coords);
  };

  const handleSelectCliente = (cliente: ClienteConDistancia | null) => {
    setSelectedCliente(cliente);
    setFocusLocation(null);
    if (cliente) {
      setSearchQuery(cliente.nombre);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const centerOnCurrentLocation = () => {
    if (!ubicacionActual) {
      alert('Primero activa la ubicación en tu navegador.');
      return;
    }

    setFocusLocation(ubicacionActual);
    setSelectedCliente(null);
    setSearchQuery('');
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-slate-100">
        <div className="text-center">
          <Navigation className="w-12 h-12 text-primary-600 animate-pulse mx-auto mb-4" />
          <p className="text-slate-600 text-lg font-medium">Preparando mapa...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full w-full p-6 bg-slate-100">
        <div className="text-center max-w-sm">
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
    <div className="h-full w-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden relative">
      <section className="relative flex-[3] min-h-0 bg-slate-900">
        <MapView
          clientes={clientesFiltrados}
          onVisitaRegistrada={cargarDatos}
          selectedCliente={selectedCliente}
          onClienteSelect={handleSelectCliente}
          focusLocation={focusLocation}
          showDetailSheet={false}
          newLocationPin={newLocationPin}
          onMapClick={(coords) => {
            setNewLocationPin(coords);
            setMostrarNuevoCliente(true);
          }}
        />

        <div className="absolute left-4 right-4 top-4 z-[800] space-y-3">
          <div className="rounded-3xl border border-white/10 bg-slate-950/90 backdrop-blur-md shadow-2xl p-3">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cliente o dirección"
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 outline-none"
              />
              {searchQuery && (
                <button onClick={clearSearch} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
              <span>
                {searching
                  ? 'Buscando...'
                  : geoStatus === 'ok'
                    ? 'Ubicación activa'
                    : 'Ubicación no disponible'}
              </span>
              <button
                onClick={centerOnCurrentLocation}
                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-slate-100 active:scale-95 transition-transform"
              >
                <LocateFixed className="w-3.5 h-3.5" />
                Mi zona
              </button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/95 backdrop-blur-md shadow-2xl">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelectResult(result)}
                  className="flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left last:border-b-0 active:bg-white/5"
                >
                  <div className="mt-0.5 rounded-full bg-primary-500/15 p-2 text-primary-300">
                    {result.type === 'cliente' ? <MapPin className="w-4 h-4" /> : <Navigation className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{result.title}</p>
                    <p className="truncate text-xs text-slate-400">{result.subtitle}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="relative flex-[2] min-h-0 border-t border-white/10 bg-slate-50 text-slate-900">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <div>
            <h1 className="text-lg font-black tracking-tight">Captura Rápida</h1>
            <p className="text-xs text-slate-500">
              {ubicacionActual
                ? 'Clientes ordenados por distancia'
                : 'Activa tu ubicación para ordenar por cercanía'}
            </p>
          </div>

          <button
            onClick={() => {
              setNewLocationPin(null);
              setMostrarNuevoCliente(true);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-600/20 active:scale-95 transition-transform"
          >
            <Plus className="w-4 h-4" />
            Nuevo
          </button>
        </div>

        {selectedCliente && (
          <div className="border-b border-slate-200 bg-primary-50 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">En foco</p>
                <h2 className="text-base font-bold text-slate-900">{selectedCliente.nombre}</h2>
                <p className="text-xs text-slate-600">{selectedCliente.tipo_negocio}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedCliente(null);
                  setFocusLocation(null);
                  setSearchQuery('');
                }}
                className="rounded-full bg-white p-2 text-slate-500 shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <div ref={listRef} className="h-full overflow-y-auto hide-scrollbar px-4 py-4">
          {clientesFiltrados.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <div>
                <p className="text-slate-600 text-base mb-4">No hay clientes que coincidan</p>
                <button
                  onClick={() => {
                    setNewLocationPin(null);
                    setMostrarNuevoCliente(true);
                  }}
                  className="rounded-full bg-primary-600 px-5 py-3 text-sm font-semibold text-white"
                >
                  Crear primer cliente
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 pb-8">
              {clientesFiltrados.map((cliente) => (
                <ClienteCard
                  key={cliente.id}
                  cliente={cliente}
                  onVentaRegistrada={cargarDatos}
                  onSelect={() => handleSelectCliente(cliente)}
                  isSelected={selectedCliente?.id === cliente.id}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {mostrarNuevoCliente && (
        <NuevoClienteModal
          ubicacionActual={newLocationPin || ubicacionActual}
          onClose={() => {
            setMostrarNuevoCliente(false);
            setNewLocationPin(null);
          }}
          onClienteCreado={handleClienteCreado}
        />
      )}
    </div>
  );
}
