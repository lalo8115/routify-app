'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Cliente, TipoTrapo } from '@/types';
import { supabase } from '@/lib/supabase';
import { formatearMoneda } from '@/lib/utils';

interface RegistroVentaModalProps {
  cliente: Cliente;
  onClose: () => void;
  onVentaRegistrada: () => void;
}

const tiposTrapo: TipoTrapo[] = ['Blanco', 'Color', 'Industrial', 'Estopa'];

export default function RegistroVentaModal({
  cliente,
  onClose,
  onVentaRegistrada,
}: RegistroVentaModalProps) {
  const [tipoTrapo, setTipoTrapo] = useState<TipoTrapo>('Industrial');
  const [precioKilo, setPrecioKilo] = useState(cliente.precio_sugerido.toString());
  const [kilos, setKilos] = useState('');
  const [montoPagado, setMontoPagado] = useState('');
  const [procesando, setProcesando] = useState(false);

  const kilosNum = parseFloat(kilos) || 0;
  const precioNum = parseFloat(precioKilo) || 0;
  const montoTotal = kilosNum * precioNum;
  const montoPagadoNum = parseFloat(montoPagado) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (kilosNum <= 0) {
      alert('Ingresa una cantidad de kilos válida');
      return;
    }

    setProcesando(true);
    try {
      const { error } = await supabase.from('visitas').insert({
        cliente_id: cliente.id,
        resultado: 'Venta',
        tipo_trapo: tipoTrapo,
        precio_kilo_aplicado: precioNum,
        kilos_vendidos: kilosNum,
        monto_total: montoTotal,
        monto_pagado: montoPagadoNum,
      });

      if (error) throw error;

      alert('¡Venta registrada exitosamente!');
      onVentaRegistrada();
    } catch (error: any) {
      console.error('Error al registrar venta:', error);
      alert('Error al registrar la venta: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 animate-slide-up">
      <div className="bg-white w-full max-w-lg rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Registrar Venta</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-gray-600 mb-6">{cliente.nombre}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de trapo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de trapo
            </label>
            <div className="grid grid-cols-2 gap-2">
              {tiposTrapo.map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setTipoTrapo(tipo)}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    tipoTrapo === tipo
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                  }`}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          {/* Precio por kilo */}
          <div>
            <label htmlFor="precio" className="block text-sm font-medium text-gray-700 mb-2">
              Precio por kilo
            </label>
            <input
              id="precio"
              type="number"
              step="0.01"
              value={precioKilo}
              onChange={(e) => setPrecioKilo(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          {/* Kilos vendidos */}
          <div>
            <label htmlFor="kilos" className="block text-sm font-medium text-gray-700 mb-2">
              Kilos vendidos
            </label>
            <input
              id="kilos"
              type="number"
              step="0.5"
              value={kilos}
              onChange={(e) => setKilos(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="0.0"
              required
            />
          </div>

          {/* Monto total (calculado) */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Monto total</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatearMoneda(montoTotal)}
            </p>
          </div>

          {/* Monto pagado */}
          <div>
            <label htmlFor="pagado" className="block text-sm font-medium text-gray-700 mb-2">
              Monto pagado (opcional)
            </label>
            <input
              id="pagado"
              type="number"
              step="0.01"
              value={montoPagado}
              onChange={(e) => setMontoPagado(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder={formatearMoneda(montoTotal)}
            />
          </div>

          {/* Deuda pendiente */}
          {montoPagadoNum < montoTotal && montoPagadoNum > 0 && (
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-600">Quedará a deber</p>
              <p className="text-xl font-bold text-red-700">
                {formatearMoneda(montoTotal - montoPagadoNum)}
              </p>
            </div>
          )}

          {/* Botón de envío */}
          <button
            type="submit"
            disabled={procesando}
            className="w-full py-4 bg-primary-600 text-white rounded-lg font-bold text-lg active:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {procesando ? 'Registrando...' : 'Registrar Venta'}
          </button>
        </form>
      </div>
    </div>
  );
}
