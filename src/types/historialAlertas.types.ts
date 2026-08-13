// HU-28: "Historial de alertas por lote y período". Vista de consulta sobre
// el mismo dominio de HU-25/HU-27 (alertas por desvío de umbral + su
// cierre), pero pensada para análisis retrospectivo (Responsable de
// calidad) en vez de la bandeja de trabajo en vivo de HU-25 (Responsable de
// producción). Por eso reusa AlertaConCierre como fila en vez de inventar un
// tipo nuevo: ya trae fecha (createdAt), lote (data.loteCodigo), parámetro
// (data.parametro), nivel (nivelAlerta), estado y accionCorrectiva — el AC2
// completo de esta HU.
import type { NivelAlerta } from "./notificacion.types";
import type { AlertaConCierre } from "./alertaCierre.types";

export type HistorialAlertaItem = AlertaConCierre;

// TODO(backend): cuando exista GET /alertas/historial (o el sub-recurso que
// termine exponiendo el backend), estos van a ser los query params reales
// de la request — loteId/nivel/fechaInicio/fechaFin/page/limit. A propósito
// tienen la misma forma que HistorialMedicionesFilterQuery (HU-19): el
// filtrado se manda al servidor, nunca se trae todo para filtrar en memoria
// acá (AC4 de la HU: la consulta tiene que responder rápido incluso con
// rangos de 90 días, y eso solo se sostiene con filtrado server-side).
// Nota: AC1 solo pide lote/nivel/período — no hay filtro de estado
// (abierta/cerrada) todavía, aunque el estado sí se muestra en el resultado
// (AC2). Si se termina pidiendo, es un campo más acá y en filtrar()
// (historialAlertas.service.ts).
export interface HistorialAlertasFilterQuery {
  loteId?: number;
  nivel?: NivelAlerta;
  fechaInicio?: string; // ISO date (yyyy-MM-dd)
  fechaFin?: string; // ISO date; sin hora, se normaliza a fin del día
  page?: number;
  limit?: number;
}

export interface HistorialAlertasResponse {
  data: HistorialAlertaItem[];
  total: number;
  page: number;
  limit: number;
}
