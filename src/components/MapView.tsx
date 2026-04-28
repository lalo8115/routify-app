'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { ShoppingCart, XCircle, Navigation, DollarSign, Calendar, X } from 'lucide-react';
import { Coordenadas, MetricasCliente } from '@/types';
import { formatearMoneda } from '@/lib/utils';
import RegistroVentaModal from './RegistroVentaModal';
import RegistroNoVentaModal from './RegistroNoVentaModal';

interface MapViewProps {
  clientes: MetricasCliente[];
  onVisitaRegistrada: () => void;
  selectedCliente?: MetricasCliente | null;
  onClienteSelect?: (cliente: MetricasCliente | null) => void;
  focusLocation?: Coordenadas | null;
  showDetailSheet?: boolean;
  onMapClick?: (coords: Coordenadas) => void;
  newLocationPin?: Coordenadas | null;
}

const DEFAULT_CENTER: [number, number] = [25.6866, -100.3161];
const DEFAULT_ZOOM = 12;

function MapControls({ onMapClick }: { onMapClick?: (coords: Coordenadas) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick?.({ latitud: e.latlng.lat, longitud: e.latlng.lng });
    }
  });
  return null;
}

function MapUpdater({ center, zoomTrigger }: { center: [number, number]; zoomTrigger: number }) {
  const map = useMap();
  useEffect(() => {
    if (zoomTrigger > 0) {
      map.setView(center, 16, { animate: true });
    } else {
      map.setView(center, DEFAULT_ZOOM);
    }
  }, [center, zoomTrigger, map]);
  return null;
}

const crearIcono = (colorHex: string) => {
  const svgIcon = `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26C32 7.163 24.837 0 16 0z"
            fill="${colorHex}"
            stroke="#fff"
            stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="#fff"/>
    </svg>
  `;
  return L.divIcon({
    html: svgIcon,
    className: 'custom-marker',
    iconSize: [32, 42],
    iconAnchor: [16, 42],
  });
};

const iconoSano = crearIcono('#10b981');
const iconoPreventivo = crearIcono('#eab308');
const iconoAlerta = crearIcono('#f97316');
const iconoCritico = crearIcono('#ef4444');
const iconoCobranza = crearIcono('#3b82f6');
const iconoProspecto = crearIcono('#6b7280');
const iconoSeleccionado = crearIcono('#7c3aed');

const iconoUsuario = typeof window !== 'undefined'
  ? L.divIcon({
      html: `
        <div class="relative flex items-center justify-center w-8 h-8">
          <div class="absolute w-8 h-8 bg-blue-500 rounded-full animate-ping opacity-75"></div>
          <div class="relative flex items-center justify-center w-6 h-6 bg-blue-600 border-2 border-white rounded-full shadow-lg">
            <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
        </div>
      `,
      className: 'custom-user-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })
  : undefined;

export default function MapView({
  clientes,
  onVisitaRegistrada,
  selectedCliente,
  onClienteSelect,
  focusLocation,
  showDetailSheet = true,
  onMapClick,
  newLocationPin,
}: MapViewProps) {
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [zoomTrigger, setZoomTrigger] = useState(0);
  const [clienteSeleccionadoLocal, setClienteSeleccionadoLocal] = useState<MetricasCliente | null>(null);
  const [mostrarVenta, setMostrarVenta] = useState(false);
  const [mostrarNoVenta, setMostrarNoVenta] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const clienteActivo = selectedCliente ?? clienteSeleccionadoLocal;

  useEffect(() => {
    let watchId: number;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error('Error watching position:', error);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    }
    return () => {
      if (watchId && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedCliente) {
      setCenter([selectedCliente.latitud, selectedCliente.longitud]);
      setZoomTrigger((prev) => prev + 1);
    }
  }, [selectedCliente]);

  useEffect(() => {
    if (focusLocation) {
      setCenter([focusLocation.latitud, focusLocation.longitud]);
      setZoomTrigger((prev) => prev + 1);
    }
  }, [focusLocation]);

  const handleVentaRegistrada = () => {
    setMostrarVenta(false);
    setMostrarNoVenta(false);
    setClienteSeleccionadoLocal(null);
    onClienteSelect?.(null);
    onVisitaRegistrada();
  };

  return (
    <div className="relative h-full w-full overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0">
        <MapContainer
          center={center}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <MapControls onMapClick={onMapClick} />
          <MapUpdater center={center} zoomTrigger={zoomTrigger} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {userLocation && iconoUsuario && (
            <Marker position={userLocation} icon={iconoUsuario} zIndexOffset={1000} />
          )}

          {newLocationPin && (
            <Marker
              position={[newLocationPin.latitud, newLocationPin.longitud]}
              icon={crearIcono('#000')}
              zIndexOffset={2000}
            />
          )}

          {clientes.map((cliente) => {
            const isSelected = clienteActivo?.id === cliente.id;
            let iconoAsignado = iconoSano;

            if (!cliente.ultima_fecha_compra) {
              iconoAsignado = iconoProspecto;
            } else if (cliente.deuda_pendiente > 0) {
              iconoAsignado = iconoCobranza;
            } else {
              const diasPasados = cliente.dias_desde_ultima_compra ?? 0;
              const frecuencia = cliente.frecuencia_compra_dias || 15;
              const ratio = diasPasados / frecuencia;

              if (ratio >= 1.0) {
                iconoAsignado = iconoCritico;
              } else if (ratio >= 0.8) {
                iconoAsignado = iconoAlerta;
              } else if (ratio >= 0.5) {
                iconoAsignado = iconoPreventivo;
              } else {
                iconoAsignado = iconoSano;
              }
            }
            if (isSelected) {
              iconoAsignado = iconoSeleccionado;
            }

            return (
              <Marker
                key={cliente.id}
                position={[cliente.latitud, cliente.longitud]}
                icon={iconoAsignado}
                zIndexOffset={isSelected ? 1000 : 0}
                eventHandlers={{
                  click: () => {
                    onClienteSelect?.(cliente);
                    if (showDetailSheet) {
                      setClienteSeleccionadoLocal(cliente);
                    }
                  },
                }}
              />
            );
          })}
        </MapContainer>
      </div>

      {showDetailSheet && clienteActivo && !mostrarVenta && !mostrarNoVenta && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-white rounded-2xl shadow-xl border border-gray-100 p-5 animate-slide-up">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{clienteActivo.nombre}</h3>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                {clienteActivo.tipo_negocio}
              </p>
            </div>
            <button
              onClick={() => {
                setClienteSeleccionadoLocal(null);
                onClienteSelect?.(null);
              }}
              className="p-2 text-gray-400 hover:text-gray-600 active:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 my-4">
            <div className="bg-blue-50/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
                  Última visita
                </span>
              </div>
              <p className="text-base font-bold text-gray-900">
                {clienteActivo.dias_desde_ultima_compra ?? 'Nuevo'} {clienteActivo.dias_desde_ultima_compra !== undefined && 'días'}
              </p>
            </div>
            <div className="bg-red-50/50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-red-600" />
                <span className="text-xs font-semibold text-red-800 uppercase tracking-wider">
                  Saldo pend.
                </span>
              </div>
              <p className="text-base font-bold text-red-700">
                {formatearMoneda(clienteActivo.deuda_pendiente)}
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button
              onClick={() => setMostrarNoVenta(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 rounded-xl font-semibold transition-colors border border-red-200"
            >
              <XCircle className="w-5 h-5" />
              <span className="text-sm">No Venta</span>
            </button>
            <button
              onClick={() => setMostrarVenta(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-semibold shadow-md shadow-blue-200 transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="text-sm">Venta</span>
            </button>
          </div>
        </div>
      )}

      {mostrarVenta && clienteActivo && (
        <RegistroVentaModal
          cliente={clienteActivo as any}
          onClose={() => setMostrarVenta(false)}
          onVentaRegistrada={handleVentaRegistrada}
        />
      )}

      {mostrarNoVenta && clienteActivo && (
        <RegistroNoVentaModal
          cliente={clienteActivo}
          onClose={() => setMostrarNoVenta(false)}
          onVisitaRegistrada={handleVentaRegistrada}
        />
      )}
    </div>
  );
}
