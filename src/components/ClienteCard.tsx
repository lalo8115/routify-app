'use client';

import { useState } from 'react';
import { ShoppingCart, XCircle, DollarSign, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { ClienteConDistancia } from '@/types';
import { formatearMoneda, formatearDias } from '@/lib/utils';
import RegistroVentaModal from './RegistroVentaModal';
import { supabase } from '@/lib/supabase';

interface ClienteCardProps {
  cliente: ClienteConDistancia;
  onVentaRegistrada: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
}

export default function ClienteCard({ cliente, onVentaRegistrada, onSelect, isSelected = false }: ClienteCardProps) {
  const [mostrarVenta, setMostrarVenta] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [mostrarAcciones, setMostrarAcciones] = useState(false);

  const handleNoCompro = async () => {
    if (procesando) return;

    setProcesando(true);
    try {
      const { error } = await supabase.from('visitas').insert({
        cliente_id: cliente.id,
        resultado: 'No_Venta',
        tipo_trapo: 'N/A',
      });

      if (error) throw error;

      alert('Visita registrada: No compró');
      onVentaRegistrada();
    } catch (error: any) {
      console.error('Error al registrar visita:', error);
      alert('Error al registrar la visita: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  const handleVentaRegistrada = () => {
    setMostrarVenta(false);
    onVentaRegistrada();
  };

  return (
    <>
      <div
        id={`cliente-${cliente.id}`}
        onClick={onSelect}
        role={onSelect ? 'button' : undefined}
        tabIndex={onSelect ? 0 : undefined}
        className={`bg-white rounded-2xl shadow-sm border p-3 transition-all ${
          isSelected ? 'border-primary-600 ring-2 ring-primary-200 shadow-lg scale-[1.01]' : 'border-gray-200'
        } ${onSelect ? 'cursor-pointer active:scale-[0.99]' : ''}`}
      >
        {/* Header del cliente */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 pr-2">
            <h3 className="text-lg font-bold text-gray-900 leading-tight">{cliente.nombre}</h3>
            <p className="text-sm text-gray-600">{cliente.tipo_negocio}</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {cliente.distancia !== undefined ? (
              <div className="flex items-center gap-1 text-[11px] text-primary-600 font-medium bg-primary-50 px-1.5 py-0.5 rounded-full">
                <MapPin className="w-3 h-3" />
                {cliente.distancia.toFixed(2)} km
              </div>
            ) : <div />}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMostrarAcciones(!mostrarAcciones);
              }}
              className="flex items-center justify-center p-1 bg-gray-50/50 rounded hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
              title="Acciones"
            >
              {mostrarAcciones ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-2 mb-0 text-center bg-gray-50 rounded-lg p-2">
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-500">Vol / $$</p>
            <p className="text-sm font-bold text-gray-900">
              {cliente.ultima_cantidad !== undefined && cliente.ultimo_monto !== undefined
                ? `${cliente.ultima_cantidad} / ${cliente.ultimo_monto}$`
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-500">Deuda</p>
            <p className={`text-sm font-bold ${cliente.deuda_pendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatearMoneda(cliente.deuda_pendiente)}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-gray-500">Última visita</p>
            <p className="text-sm font-bold text-gray-900">
              {formatearDias(cliente.dias_desde_ultima_compra)}
            </p>
          </div>
        </div>

        {/* Botones de acción */}
        {mostrarAcciones && (
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMostrarVenta(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium active:bg-primary-700 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
              Venta
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNoCompro();
              }}
              disabled={procesando}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium active:bg-gray-300 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              No compró
            </button>
          </div>
        )}
      </div>

      {/* Modal de registro de venta */}
      {mostrarVenta && (
        <RegistroVentaModal
          cliente={cliente}
          onClose={() => setMostrarVenta(false)}
          onVentaRegistrada={handleVentaRegistrada}
        />
      )}
    </>
  );
}
