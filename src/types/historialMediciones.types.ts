// Espeja el endpoint real de historial de mediciones en optilacteo-backend
// (HU-19, rama feature/HU-19, módulo src/module/sensor -> /sensores/lecturas).

export enum EstadoLectura {
  NORMAL = "NORMAL",
  FUERA_DE_RANGO = "FUERA_DE_RANGO",
  SIN_UMBRAL_CONFIGURADO = "SIN_UMBRAL_CONFIGURADO",
}

// Fila del historial (LecturaHistorialItemDto real). OJO: el JSON paginado
// usa estos nombres (sensorNombre/loteCodigo/timestampLectura), pero el CSV
// de /export tiene headers distintos (sensor/lote/fechaHora) - el backend
// no los unificó.
export interface HistorialMedicionItem {
  id: number;
  valor: number;
  unidad: string;
  sensorNombre: string;
  parametro: string;
  loteCodigo: string;
  timestampLectura: string; // ISO datetime
  estado: EstadoLectura;
}

export interface HistorialMedicionesFilterQuery {
  fechaInicio?: string; // ISO date (yyyy-MM-dd)
  fechaFin?: string; // ISO date; si no trae hora, el backend la normaliza a fin del día
  loteCodigo?: string;
  page?: number;
  limit?: number;
}

export interface HistorialMedicionesResponse {
  data: HistorialMedicionItem[];
  total: number;
  page: number;
  limit: number;
  // true si el rango de fechas supera 30 días: es un aviso, no un bloqueo.
  rangoAmplio: boolean;
}
