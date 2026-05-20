'use client';

import { useState, useEffect } from 'react';
import { X, PlusCircle } from 'lucide-react';
import { Cliente } from '@/types';
import { supabase } from '@/lib/supabase';
import { formatearMoneda } from '@/lib/utils';

interface RegistroVentaModalProps {
  cliente: Cliente;
  onClose: () => void;
  onVentaRegistrada: () => void;
}

type Producto = {
  id: string;
  nombre: string;
  unidad_medida: string;
  precio_base: number;
};

export default function RegistroVentaModal({
  cliente,
  onClose,
  onVentaRegistrada,
}: RegistroVentaModalProps) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productoId, setProductoId] = useState<string>('');
  const [precioUnitario, setPrecioUnitario] = useState(cliente.precio_sugerido.toString());
  const [cantidad, setCantidad] = useState('');
  const [montoPagado, setMontoPagado] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [cargandoProductos, setCargandoProductos] = useState(true);

  // Obtener productos disponibles
  useEffect(() => {
    const fetchProductos = async () => {
      setCargandoProductos(true);
      const { data } = await supabase
        .from('productos')
        .select('id, nombre, unidad_medida, precio_base')
        .eq('activo', true)
        .order('nombre');
      
      if (data && data.length > 0) {
        setProductos(data);
        setProductoId(data[0].id);
        if (data[0].precio_base > 0) {
          setPrecioUnitario(data[0].precio_base.toString());
        }
      }
      setCargandoProductos(false);
    };
    fetchProductos();
  }, []);

  // Actualizar precio si eligen otro producto que tenga precio base
  useEffect(() => {
    const prod = productos.find((p) => p.id === productoId);
    if (prod && prod.precio_base > 0) {
      setPrecioUnitario(prod.precio_base.toString());
    } else {
      setPrecioUnitario(cliente.precio_sugerido.toString());
    }
  }, [productoId, productos, cliente.precio_sugerido]);

  const cantNum = parseFloat(cantidad) || 0;
  const precioNum = parseFloat(precioUnitario) || 0;
  const montoTotal = cantNum * precioNum;
  const montoPagadoNum = parseFloat(montoPagado) || 0;

  const getUnidadMedida = () => {
    const p = productos.find(x => x.id === productoId);
    return p ? p.unidad_medida : 'unidades';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cantNum <= 0) {
      alert(`Ingresa una cantidad mayor a cero`);
      return;
    }
    
    if (!productoId) {
      alert('Debes seleccionar un producto del catálogo SaaS');
      return;
    }

    setProcesando(true);
    try {
      const { error } = await supabase.from('visitas').insert({
        cliente_id: cliente.id,
        resultado: 'Venta',
        producto_id: productoId, // NUEVO CRM Dinámico
        precio_unitario: precioNum, // Nuevo campo
        cantidad: cantNum, // Nuevo campo
        monto_total: montoTotal,
        monto_pagado: montoPagadoNum,
      });

      if (error) throw error;

      alert('¡Venta registrada exitosamente!');
      onVentaRegistrada();
    } catch (error: any) {
      console.error('Error al registrar venta:', error);
      alert('Error: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-[1050] animate-slide-up">
      <div className="bg-white w-full max-w-lg rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto pb-24">
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
          {/* Producto Dinámico */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Producto a Vender
            </label>
            {cargandoProductos ? (
              <p className="text-sm text-gray-500">Cargando catálogo...</p>
            ) : productos.length === 0 ? (
              <div className="bg-orange-50 p-4 rounded-lg flex gap-3 text-orange-800 text-sm">
                <PlusCircle className="w-5 h-5 flex-shrink-0" />
                <p>No tienes productos en tu CRM. Ve a "SaaS Config." para crear tu catálogo de ventas.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {productos.map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => setProductoId(prod.id)}
                    className={`px-4 py-3 rounded-lg font-medium transition-colors border ${
                      productoId === prod.id
                        ? 'bg-primary-600 text-white border-primary-600 shadow-md'
                        : 'bg-white text-gray-700 border-gray-200 active:bg-gray-100'
                    }`}
                  >
                    <span className="block text-sm">{prod.nombre}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Precio y Cantidad en Fila */}
          <div className="flex gap-4 w-full">
            {/* Cantidad de unidades */}
            <div className="w-1/2">
              <label htmlFor="cantidad" className="block text-sm font-medium text-gray-700 mb-2">
                Cantidad ({getUnidadMedida()})
              </label>
              <input
                id="cantidad"
                type="number"
                step="0.5"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="Ej. 10"
                required
              />
            </div>
            
            {/* Precio Unitario */}
            <div className="w-1/2">
              <label htmlFor="precio" className="block text-sm font-medium text-gray-700 mb-2">
                Precio c/{getUnidadMedida()}
              </label>
              <input
                id="precio"
                type="number"
                step="0.01"
                value={precioUnitario}
                onChange={(e) => setPrecioUnitario(e.target.value)}
                className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                required
              />
            </div>
          </div>

          {/* Monto total (calculado) */}
          <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center mt-2">
            <p className="text-sm text-gray-600">Total a cobrar</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatearMoneda(montoTotal)}
            </p>
          </div>

          {/* Monto pagado */}
          <div>
            <label htmlFor="pagado" className="block text-sm font-medium text-gray-700 mb-2">
              ¿Cuánto te pagó? (opcional)
            </label>
            <input
              id="pagado"
              type="number"
              step="0.01"
              value={montoPagado}
              onChange={(e) => setMontoPagado(e.target.value)}
              className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg text-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder={formatearMoneda(montoTotal)}
            />
          </div>

          {/* Deuda pendiente */}
          {montoPagadoNum < montoTotal && montoPagadoNum > 0 && (
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-600">Quedará a deber (Deuda)</p>
              <p className="text-xl font-bold text-red-700">
                {formatearMoneda(montoTotal - montoPagadoNum)}
              </p>
            </div>
          )}

          {/* Botón de envío */}
          <button
            type="submit"
            disabled={procesando || productos.length === 0}
            className="w-full py-4 bg-primary-600 text-white rounded-lg font-bold text-lg active:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            {procesando ? 'Guardando Venta...' : 'Cobrar e Imprimir'}
          </button>
        </form>
      </div>
    </div>
  );
}
