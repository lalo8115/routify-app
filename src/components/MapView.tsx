'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { ShoppingCart, XCircle } from 'lucide-react';
import { MetricasCliente } from '@/types';
import { formatearMoneda, formatearDias } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import RegistroVentaModal from './RegistroVentaModal';

interface MapViewProps {
  clientes: MetricasCliente[];
  onVisitaRegistrada: () => void;
}

// Coordenadas por defecto (zona urbana de ejemplo: Monterrey)
const DEFAULT_CENTER: [number, number] = [25.7460, -100.2801];
const DEFAULT_ZOOM = 13;

// Componente para actualizar el centro del mapa cuando se obtiene la ubicación
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, DEFAULT_ZOOM);
  }, [center, map]);
  
  return null;
}

// Crear iconos personalizados para los pines
const crearIcono = (color: 'green' | 'red') => {
  const svgIcon = `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26C32 7.163 24.837 0 16 0z" 
            fill="${color === 'green' ? '#10b981' : '#ef4444'}" 
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
    popupAnchor: [0, -42],
  });
};

const iconoVerde = crearIcono('green');
const iconoRojo = crearIcono('red');

export default function MapView({ clientes, onVisitaRegistrada }: MapViewProps) {
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<MetricasCliente | null>(null);
  const [mostrarVenta, setMostrarVenta] = useState(false);

  useEffect(() => {
    // Intentar obtener la ubicación del usuario
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenter([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.log('No se pudo obtener la ubicación, usando ubicación por defecto', error);
        }
      );
    }
  }, []);

  const handleNoCompro = async (clienteId: string) => {
    try {
      const { error } = await supabase.from('visitas').insert({
        cliente_id: clienteId,
        resultado: 'No_Venta',
        tipo_trapo: 'N/A',
      });

      if (error) throw error;

      alert('Visita registrada: No compró');
      setClienteSeleccionado(null);
      onVisitaRegistrada();
    } catch (error: any) {
      console.error('Error al registrar visita:', error);
      alert('Error al registrar la visita: ' + error.message);
    }
  };

  const handleRegistrarVenta = (cliente: MetricasCliente) => {
    setClienteSeleccionado(cliente);
    setMostrarVenta(true);
  };

  const handleVentaRegistrada = () => {
    setMostrarVenta(false);
    setClienteSeleccionado(null);
    onVisitaRegistrada();
  };

  return (
    <>
      <MapContainer
        center={center}
        zoom={DEFAULT_ZOOM}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <MapUpdater center={center} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {clientes.map((cliente) => {
          // Determinar color del pin: rojo si hace más de 15 días sin compra
          const diasSinCompra = cliente.dias_desde_ultima_compra ?? 999;
          const icono = diasSinCompra > 15 ? iconoRojo : iconoVerde;

          return (
            <Marker
              key={cliente.id}
              position={[cliente.latitud, cliente.longitud]}
              icon={icono}
            >
              <Popup className="custom-popup" minWidth={250}>
                <div className="p-2">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {cliente.nombre}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">{cliente.tipo_negocio}</p>

                  <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-600">Deuda</p>
                      <p className={`font-bold ${
                        cliente.deuda_pendiente > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatearMoneda(cliente.deuda_pendiente)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Última compra</p>
                      <p className="font-bold text-gray-900">
                        {formatearDias(cliente.dias_desde_ultima_compra)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleRegistrarVenta(cliente)}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Venta
                    </button>
                    <button
                      onClick={() => handleNoCompro(cliente.id)}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      No compró
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Modal de registro de venta */}
      {mostrarVenta && clienteSeleccionado && (
        <RegistroVentaModal
          cliente={clienteSeleccionado}
          onClose={() => {
            setMostrarVenta(false);
            setClienteSeleccionado(null);
          }}
          onVentaRegistrada={handleVentaRegistrada}
        />
      )}

      <style jsx global>{`
        .custom-marker {
          background: none;
          border: none;
        }

        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 0;
        }

        .leaflet-popup-content {
          margin: 0;
          width: 100% !important;
        }

        .custom-popup .leaflet-popup-close-button {
          font-size: 24px;
          padding: 8px;
        }
      `}</style>
    </>
  );
}
