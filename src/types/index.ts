// Tipos de Base de Datos (reflejan el schema SQL)

export type TipoNegocio = 'Mecánico' | 'Torno' | 'Rectificadora' | 'Hojalatería' | 'Otro';

export type ResultadoVisita = 'Venta' | 'No_Venta' | 'Abono';

export type TipoTrapo = 'Blanco' | 'Color' | 'Industrial' | 'Estopa' | 'N/A';

export interface Cliente {
  id: string;
  nombre: string;
  tipo_negocio: TipoNegocio;
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
  tipo_trapo: TipoTrapo;
  precio_kilo_aplicado: number | null;
  kilos_vendidos: number | null;
  monto_total: number | null;
  monto_pagado: number | null;
  fecha: string;
  created_at?: string;
}

export interface MetricasCliente {
  id: string;
  nombre: string;
  tipo_negocio: TipoNegocio;
  celular: string;
  precio_sugerido: number;
  latitud: number;
  longitud: number;
  activo: boolean;
  total_kilos_comprados: number;
  deuda_pendiente: number;
  ultima_fecha_compra: string | null;
  dias_desde_ultima_compra: number | null;
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
  tipo_negocio: TipoNegocio;
  celular: string;
  precio_sugerido: number;
  latitud: number;
  longitud: number;
}

export interface RegistroVentaFormData {
  cliente_id: string;
  tipo_trapo: TipoTrapo;
  precio_kilo_aplicado: number;
  kilos_vendidos: number;
  monto_pagado: number;
}
