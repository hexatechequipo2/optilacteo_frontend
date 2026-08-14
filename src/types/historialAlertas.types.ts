// HU-28: "Historial de alertas por lote y período". Vista de consulta sobre
// el mismo dominio de HU-25/HU-27 (alertas por desvío de umbral + su
// cierre), pero pensada para análisis retrospectivo (Responsable de
// calidad) en vez de la bandeja de trabajo en vivo de HU-25 (Responsable de
// producción). Por eso reusa AlertaConCierre como fila en vez de inventar un
// tipo nuevo: ya trae fecha (createdAt), lote (data.loteCodigo), parámetro
// (data.parametro), nivel (nivelAlerta), estado y accionCorrectiva — el AC2
// completo de esta HU.
import type { NivelAlerta } from "./notificacion.types";
import type { AlertaConCierre, EstadoAlerta } from "./alertaCierre.types";

export type HistorialAlertaItem = AlertaConCierre;

// Query params reales de GET /notificaciones/historial (optilacteo-backend,
// HistorialAlertasQueryDto — module/notificaciones/dto). Mismos nombres que
// el DTO del backend (nivelAlerta, no "nivel") para poder mandar `filters`
// directo como `params` de axios sin traducir nada acá. El filtrado se hace
// server-side, nunca se trae todo para filtrar en memoria (AC4 de la HU: la
// consulta tiene que responder rápido incluso con rangos de 90 días).
export interface HistorialAlertasFilterQuery {
  loteId?: number;
  nivelAlerta?: NivelAlerta;
  estado?: EstadoAlerta;
  fechaInicio?: string; // ISO date (yyyy-MM-dd)
  fechaFin?: string; // ISO date; sin hora, el backend la normaliza a fin del día
  page?: number;
  limit?: number;
}

export interface HistorialAlertasResponse {
  data: HistorialAlertaItem[];
  total: number;
  page: number;
  limit: number;
}
