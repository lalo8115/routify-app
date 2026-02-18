'use client';

import { useState } from 'react';
import { ShoppingCart, XCircle, DollarSign, MapPin } from 'lucide-react';
import { ClienteConDistancia } from '@/types';
import { formatearMoneda, formatearDias } from '@/lib/utils';
import RegistroVentaModal from './RegistroVentaModal';
import { supabase } from '@/lib/supabase';

interface ClienteCardProps {
  cliente: ClienteConDistancia;
  onVentaRegistrada: () => void;
}

export default function ClienteCard({ cliente, onVentaRegistrada }: ClienteCardProps) {
  const [mostrarVenta, setMostrarVenta] = useState(false);
  const [procesando, setProcesando] = useState(false);

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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        {/* Header del cliente */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">{cliente.nombre}</h3>
            <p className="text-sm text-gray-600">{cliente.tipo_negocio}</p>
          </div>
          {cliente.distancia !== undefined && (
            <div className="flex items-center gap-1 text-sm text-primary-600 font-medium">
              <MapPin className="w-4 h-4" />
              {cliente.distancia.toFixed(2)} km
            </div>
          )}
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-3 mb-4 text-center bg-gray-50 rounded-lg p-3">
          <div>
            <p className="text-xs text-gray-600">Precio/kg</p>
            <p className="text-sm font-bold text-gray-900">
              {formatearMoneda(cliente.precio_sugerido)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Deuda</p>
            <p className={`text-sm font-bold ${cliente.deuda_pendiente > 0 ? 'text-red-600' : 'text-green-600'}`}>
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

        {/* Botones de acción */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMostrarVenta(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 text-white rounded-lg font-medium active:bg-primary-700 transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            Venta
          </button>
          <button
            onClick={handleNoCompro}
            disabled={procesando}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium active:bg-gray-300 transition-colors disabled:opacity-50"
          >
            <XCircle className="w-5 h-5" />
            No compró
          </button>
        </div>
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
