// Tipos de Base de Datos (reflejan el schema SQL)

export type TipoNegocio = 'Mecánico' | 'Torno' | 'Rectificadora' | 'Hojalatería' | 'Otro';

export type ResultadoVisita = 'Venta' | 'No_Venta' | 'Abono';

export interface Cliente {
  id: string;
  nombre: string;
  tipo_negocio?: TipoNegocio;
  categoria_id?: string;
  categoria_nombre?: string;
  celular: string;
  precio_sugerido: number;
  latitud: number;
  longitud: number;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Visita {
  id: string;
  cliente_id: string;
  resultado: ResultadoVisita;
  producto_id?: string | null;
  precio_kilo_aplicado: number | null;
  cantidad: number | null;
  monto_total: number | null;
  monto_pagado: number | null;
  fecha: string;
  created_at?: string;
}

export interface MetricasCliente {
  id: string;
  nombre: string;
  tipo_negocio?: TipoNegocio;
  categoria_id?: string;
  categoria_nombre?: string;
  celular: string;
  precio_sugerido: number;
  latitud: number;
  longitud: number;
  activo: boolean;
  total_kilos_comprados: number;
  deuda_pendiente: number;
  ultima_fecha_compra: string | null;
  dias_desde_ultima_compra: number | null;
  // Nuevos campos proyectados
  frecuencia_compra_dias?: number; 
  proxima_fecha_visita_estimada?: string | null;
  ultima_cantidad?: number;
  ultimo_monto?: number;
}

// Interfaces para la UI

export interface ClienteConDistancia extends MetricasCliente {
  distancia?: number; // en kilómetros
}

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

export interface NuevoClienteFormData {
  nombre: string;
  categoria_id?: string;
  celular: string;
  precio_sugerido: number;
  latitud: number;
  longitud: number;
}

export interface RegistroVentaFormData {
  cliente_id: string;
  producto_id?: string;
  precio_kilo_aplicado: number;
  cantidad: number;
  monto_pagado: number;
}
