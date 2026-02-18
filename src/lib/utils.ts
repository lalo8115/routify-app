import { Coordenadas } from '@/types';

/**
 * Calcula la distancia entre dos coordenadas usando la fórmula de Haversine
 * @param coord1 Primera coordenada
 * @param coord2 Segunda coordenada
 * @returns Distancia en kilómetros
 */
export function calcularDistancia(
  coord1: Coordenadas,
  coord2: Coordenadas
): number {
  const R = 6371; // Radio de la Tierra en kilómetros
  const dLat = toRad(coord2.latitud - coord1.latitud);
  const dLon = toRad(coord2.longitud - coord1.longitud);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.latitud)) *
      Math.cos(toRad(coord2.latitud)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Formatea un número como moneda MXN
 */
export function formatearMoneda(monto: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(monto);
}

/**
 * Formatea un número de celular para WhatsApp
 * Asegura que tenga el formato correcto sin espacios ni guiones
 */
export function formatearCelularWhatsApp(celular: string): string {
  // Elimina espacios, guiones y paréntesis
  return celular.replace(/[\s\-\(\)]/g, '');
}

/**
 * Genera un enlace de WhatsApp con un mensaje predeterminado
 */
export function generarEnlaceWhatsApp(
  celular: string,
  mensaje: string = 'Hola, te contacto desde TrapoApp'
): string {
  const celularLimpio = formatearCelularWhatsApp(celular);
  const mensajeCodificado = encodeURIComponent(mensaje);
  return `https://wa.me/${celularLimpio}?text=${mensajeCodificado}`;
}

/**
 * Obtiene la ubicación actual del dispositivo
 */
export function obtenerUbicacionActual(): Promise<Coordenadas> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('La geolocalización no está soportada en este navegador'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Formatea días en texto legible
 */
export function formatearDias(dias: number | null): string {
  if (dias === null) return 'Nunca';
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Hace 1 día';
  return `Hace ${dias} días`;
}
