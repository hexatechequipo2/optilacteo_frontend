// HU-28: "Historial de alertas por lote y período". Vista de consulta sobre
// el mismo dominio de HU-25/HU-27 (alertas por desvío de umbral + su
// cierre), pero pensada para análisis retrospectivo (Responsable de
// calidad) en vez de la bandeja de trabajo en vivo de HU-25 (Responsable de
// producción). Por eso reusa AlertaConCierre como fila en vez de inventar un
// tipo nuevo: ya trae fecha (createdAt), lote (loteCodigo), parámetro
// (parametro), nivel (nivelAlerta), estado y accionCorrectiva — el AC2
// completo de esta HU.
import type { NivelAlerta } from "./notificacion.types";
import type { AlertaConCierre, EstadoAlerta } from "./alertaCierre.types";

// HU-50 fix: el comentario de HU-31 de acá decía que el backend restringía
// GET /notificaciones/historial a tipo=alerta_umbral y por eso fijaba esto a
// AlertaUmbralConCierre — pero el controller real (obtenerHistorial,
// optilacteo-backend) siempre devolvió también alerta_sensor_desconectado, y
// HU-50 sumó alerta_anomalia a la misma consulta (ver comentario "HISTORIAL
// DE ALERTAS (umbral, sensor desconectado y anomalías)" en
// notificaciones.controller.ts). Con el tipo angosto, HistorialAlertasTabla
// indexaba NIVEL_ALERTA_META[item.nivelAlerta] asumiendo que siempre era un
// NivelAlerta válido — para alerta_anomalia el backend nunca lo completa
// (viene null), así que era `undefined.badgeVariant` y tiraba abajo toda la
// pantalla (blanco) apenas la respuesta traía una anomalía. Volver a la
// unión completa fuerza a HistorialAlertasTabla a discriminar por `tipo`,
// igual que ya hace AlertasPage.tsx con esta misma unión.
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
