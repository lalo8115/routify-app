'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Coordenadas, TipoNegocio } from '@/types';
import { supabase } from '@/lib/supabase';

interface NuevoClienteModalProps {
  ubicacionActual: Coordenadas | null;
  onClose: () => void;
  onClienteCreado: () => void;
}

const tiposNegocio: TipoNegocio[] = [
  'Mecánico',
  'Torno',
  'Rectificadora',
  'Hojalatería',
  'Otro',
];

export default function NuevoClienteModal({
  ubicacionActual,
  onClose,
  onClienteCreado,
}: NuevoClienteModalProps) {
  const [nombre, setNombre] = useState('');
  const [tipoNegocio, setTipoNegocio] = useState<TipoNegocio>('Mecánico');
  const [celular, setCelular] = useState('+52');
  const [precioSugerido, setPrecioSugerido] = useState('25.00');
  const [procesando, setProcesando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ubicacionActual) {
      alert('No se pudo obtener la ubicación. Intenta nuevamente.');
      return;
    }

    if (!celular.startsWith('+52')) {
      alert('El número debe comenzar con +52');
      return;
    }

    setProcesando(true);
    try {
      const { error } = await supabase.from('clientes').insert({
        nombre: nombre.trim(),
        tipo_negocio: tipoNegocio,
        celular: celular.trim(),
        precio_sugerido: parseFloat(precioSugerido),
        latitud: ubicacionActual.latitud,
        longitud: ubicacionActual.longitud,
      });

      if (error) throw error;

      alert('¡Cliente creado exitosamente!');
      onClienteCreado();
    } catch (error: any) {
      console.error('Error al crear cliente:', error);
      alert('Error al crear el cliente: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 animate-slide-up">
      <div className="bg-white w-full max-w-lg rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Nuevo Cliente</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del negocio *
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Ej: Taller Los Pinos"
              required
            />
          </div>

          {/* Tipo de negocio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de negocio *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {tiposNegocio.map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setTipoNegocio(tipo)}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    tipoNegocio === tipo
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                  }`}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>

          {/* Celular */}
          <div>
            <label htmlFor="celular" className="block text-sm font-medium text-gray-700 mb-2">
              Celular (con +52) *
            </label>
            <input
              id="celular"
              type="tel"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="+525512345678"
              required
            />
          </div>

          {/* Precio sugerido */}
          <div>
            <label htmlFor="precio" className="block text-sm font-medium text-gray-700 mb-2">
              Precio sugerido por kilo *
            </label>
            <input
              id="precio"
              type="number"
              step="0.01"
              value={precioSugerido}
              onChange={(e) => setPrecioSugerido(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          {/* Información de ubicación */}
          {ubicacionActual && (
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-700 font-medium">
                ✓ Ubicación GPS capturada
              </p>
              <p className="text-xs text-green-600 mt-1">
                Lat: {ubicacionActual.latitud.toFixed(6)}, Lon: {ubicacionActual.longitud.toFixed(6)}
              </p>
            </div>
          )}

          {/* Botón de envío */}
          <button
            type="submit"
            disabled={procesando || !ubicacionActual}
            className="w-full py-4 bg-primary-600 text-white rounded-lg font-bold text-lg active:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {procesando ? 'Creando...' : 'Crear Cliente'}
          </button>
        </form>
      </div>
    </div>
  );
}
