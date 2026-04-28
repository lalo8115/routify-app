'use client';

import { useState } from 'react';
import { X, CalendarClock, MessageSquareWarning, DollarSign } from 'lucide-react';
import { MetricasCliente } from '@/types';
import { supabase } from '@/lib/supabase';
import { formatearMoneda } from '@/lib/utils';

interface RegistroNoVentaModalProps {
  cliente: MetricasCliente;
  onClose: () => void;
  onVisitaRegistrada: () => void;
}

const MOTIVOS_RAPIDOS = [
  'Local Cerrado',
  'Tienen mucho material',
  'Sin dinero hoy',
  'No estaba el encargado',
  'Compraron a otro proveedor',
];

export default function RegistroNoVentaModal({
  cliente,
  onClose,
  onVisitaRegistrada,
}: RegistroNoVentaModalProps) {
  const [motivo, setMotivo] = useState<string>('');
  const [otroMotivo, setOtroMotivo] = useState('');
  const [fechaVolver, setFechaVolver] = useState<string>(''); // Vacia = automatico
  const [montoAbono, setMontoAbono] = useState<string>('');
  const [procesando, setProcesando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const abonoNum = parseFloat(montoAbono) || 0;
    const esAbono = abonoNum > 0;
    
    // Si no es un abono puro, exigimos motivo de por qué no compró
    const motivoFinal = motivo === 'Otro' ? otroMotivo : motivo;
    if (!esAbono && !motivoFinal) {
      alert('Debes seleccionar o escribir un motivo de no venta');
      return;
    }

    setProcesando(true);
    try {
      const notasArr = [];
      if (motivoFinal) notasArr.push(`[MOTIVO: ${motivoFinal}]`);
      if (fechaVolver) notasArr.push(`[SEGUIMIENTO ACORDADO: ${fechaVolver}]`);
      if (esAbono) notasArr.push(`[ABONO REGISTRADO: ${formatearMoneda(abonoNum)}]`);
      
      const notaEstructurada = notasArr.join(' | ');

      const { error } = await supabase.from('visitas').insert({
        cliente_id: cliente.id,
        resultado: esAbono ? 'Abono' : 'No_Venta',
        tipo_trapo: 'N/A', // Retrocompatibilidad
        monto_total: 0,
        monto_pagado: abonoNum,
        notas: notaEstructurada,
      });

      if (error) throw error;

      alert(esAbono ? '¡Abono y seguimiento guardado!' : 'Seguimiento guardado correctamente');
      onVisitaRegistrada();
    } catch (error: any) {
      console.error('Error:', error);
      alert('Error al registrar: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  // Sugerencia de fechas basada en su frecuencia (si existe) o default 10 días
  const diasSugeridos = cliente.frecuencia_compra_dias || 10;
  const defaultFechaSug = new Date();
  defaultFechaSug.setDate(defaultFechaSug.getDate() + diasSugeridos);
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-[9999] animate-slide-up">
      <div className="bg-white w-full max-w-lg rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto pb-24">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquareWarning className="w-6 h-6 text-orange-500" />
            <h2 className="text-xl font-bold text-gray-900">Visita (No Venta / Abono)</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-5 border-b pb-4">
          Cliente: <strong>{cliente.nombre}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECCIÓN 1: Abono (Si tiene deuda) */}
          {cliente.deuda_pendiente > 0 && (
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
              <label className="block text-sm font-semibold text-blue-900 mb-2 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4" />
                Debe {formatearMoneda(cliente.deuda_pendiente)} ¿Nos dejó algún abono?
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max={cliente.deuda_pendiente} // Opcional, evitar pasarse
                value={montoAbono}
                onChange={(e) => setMontoAbono(e.target.value)}
                placeholder="Ej. 150.00"
                className="w-full p-3 border border-blue-200 rounded-lg text-lg text-black outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <p className="text-xs text-blue-600 mt-1.5">Si ingresas un monto, la visita se registrará como "Abono".</p>
            </div>
          )}

          {/* SECCIÓN 2: Motivos Rápidos */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              ¿Qué pasó o por qué no compró? {parseFloat(montoAbono) > 0 ? '(Opcional ya que abonó)' : '*'}
            </label>
            <div className="flex flex-wrap gap-2">
              {MOTIVOS_RAPIDOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotivo(m)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors border ${
                    motivo === m
                      ? 'bg-orange-100 text-orange-800 border-orange-300 font-medium'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {m}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setMotivo('Otro')}
                className={`px-3 py-2 rounded-lg text-sm transition-colors border ${
                  motivo === 'Otro'
                    ? 'bg-orange-100 text-orange-800 border-orange-300 font-medium'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Otro motivo...
              </button>
            </div>
            {motivo === 'Otro' && (
              <input
                type="text"
                value={otroMotivo}
                onChange={(e) => setOtroMotivo(e.target.value)}
                placeholder="Escribe el motivo..."
                className="mt-3 w-full p-3 border border-gray-300 rounded-lg text-sm text-black outline-none focus:ring-2 focus:ring-orange-500"
                required={parseFloat(montoAbono) === 0}
              />
            )}
          </div>

          {/* SECCIÓN 3: Días para Volver */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5"><CalendarClock className="w-4 h-4" />¿Agendar retorno específico?</span>
            </label>
            <input
              type="date"
              min={minDate}
              value={fechaVolver}
              onChange={(e) => setFechaVolver(e.target.value)}
              className="w-full text-black p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Si lo dejas en blanco, la app calculará automáticamente (aprox. en {diasSugeridos} días) en base a su historial.
            </p>
          </div>

          <button
            type="submit"
            disabled={procesando}
            className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold text-lg hover:bg-black transition-colors disabled:opacity-50 mt-4"
          >
            {procesando ? 'Guardando...' : 'Guardar y Cerrar Visita'}
          </button>
        </form>
      </div>
    </div>
  );
}