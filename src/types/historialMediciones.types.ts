// Espeja el endpoint real de historial de mediciones en optilacteo-backend
// (HU-19, rama feature/HU-19, módulo src/module/sensor -> /sensores/lecturas).

// TODO(backend): sensor_lecturas.origen (HU-15, OrigenLectura sensor/manual)
// existe en la entity pero LecturaHistorialItemDto/LecturaMapper.toHistorialItemDto
// (lectura-sensor.controller.ts) todavía no lo exponen acá, así que hoy el
// historial no permite diferenciar una lectura real de un ingreso manual de
// fallback (HU-15, criterio "diferenciado en el historial"). `origen` queda
// opcional para no romper nada mientras tanto; en cuanto el backend lo agregue,
// alcanza con sacarle el `?` y mostrar el badge en HistorialMedicionesTab.
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
  // HU-15: ver TODO(backend) arriba - no llega todavía.
  origen?: "sensor" | "manual";
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
