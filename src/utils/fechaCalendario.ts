// HU-75 (EP-7): una "fecha calendario" es un día sin hora ni huso
// ("YYYY-MM-DD", lo mismo que devuelve <input type="date">). Se maneja
// siempre como string: new Date("2026-06-10") la interpreta como medianoche
// UTC (el 09/06 a las 21:00 en Argentina), y toISOString() sobre una fecha
// local la corre al día siguiente después de las 21:00 AR. El backend
// espera exactamente este formato y lo interpreta en hora AR.
import type { RangoFechasCalendario } from "../types/fechaCalendario.types";

const REGEX_FECHA_CALENDARIO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function esFechaCalendario(valor: string): boolean {
  const match = REGEX_FECHA_CALENDARIO.exec(valor);
  if (!match) return false;
  const anio = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  // Date.UTC solo para validar que el día exista (31/02 no); el Date no se
  // usa para nada más, así que no hay huso que lo pueda correr.
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    d.getUTCFullYear() === anio &&
    d.getUTCMonth() === mes - 1 &&
    d.getUTCDate() === dia
  );
}

// Con formato fijo YYYY-MM-DD el orden lexicográfico coincide con el
// cronológico: se compara como string, sin construir Dates.
export function esRangoInvertido(desde: string, hasta: string): boolean {
  return esFechaCalendario(desde) && esFechaCalendario(hasta) && desde > hasta;
}

// "2026-06-10" → "10/06/2026"
export function formatearFechaCalendario(valor: string): string {
  const [anio, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${anio}`;
}

// Día calendario de un Date según el reloj LOCAL del navegador. Reemplaza a
// `date.toISOString().slice(0, 10)`, que después de las 21:00 AR (UTC-3) ya
// devuelve el día siguiente.
export function aFechaCalendario(fecha: Date = new Date()): string {
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

// Criterio de rango HU-75, el mismo que el backend
// (common/utils/rango-fechas.ts → rangoDiasInclusivoEmpresa):
//  - "desde" y "hasta" son días calendario INCLUSIVOS en hora AR: del 10 al
//    15 incluye 10, 11, 12, 13, 14 y 15 completos, nada del 9 ni del 16.
//  - El front NUNCA los convierte a instante (ni Date, ni toISOString, ni
//    "T00:00"): viajan como "YYYY-MM-DD" y el backend los traduce a
//    [desde 00:00 AR, hasta+1 00:00 AR). Así el resultado no depende del
//    huso del navegador ni de la hora en que se consulte.
export function serializarRangoCalendario(
  rango: RangoFechasCalendario,
): RangoFechasCalendario {
  if (!esFechaCalendario(rango.desde) || !esFechaCalendario(rango.hasta)) {
    throw new Error(`Rango de fechas inválido: "${rango.desde}" – "${rango.hasta}"`);
  }
  return { desde: rango.desde, hasta: rango.hasta };
}
