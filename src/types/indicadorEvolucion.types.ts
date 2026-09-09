// HU-39 (Sprint 4): tipos del gráfico de evolución de indicadores de calidad
// a través de todos los lotes de la empresa. No corresponden 1:1 con el
// enum Parametro del backend (configParametro.types.ts) — ese enum no
// incluye "células somáticas" (lo pide el prototipo de esta HU) y, sobre
// todo, no hay ningún endpoint que devuelva series agregadas por parámetro
// a través de todos los lotes (ver mockEvolucionIndicadores.ts para el
// detalle de por qué esto es mock).
export type PeriodoEvolucion = "dia" | "semana" | "mes" | "rango";

export type TipoGraficoEvolucion = "linea" | "barras";

export type Granularidad = "hora" | "dia" | "semana" | "mes";

export type IndicadorEvolucionId =
  | "grasa"
  | "proteina"
  | "acidez"
  | "temperatura"
  | "celulasSomaticas"
  | "densidad";

export interface IndicadorEvolucionConfig {
  id: IndicadorEvolucionId;
  label: string;
  unidad: string;
  color: string;
  rango: [number, number];
}

export interface PuntoSerieEvolucion {
  timestamp: string;
  etiqueta: string;
  valores: Partial<Record<IndicadorEvolucionId, number>>;
}
