// HU-34/HU-37: historial UNIFICADO de cambios de destino productivo de un
// lote, sin importar si el cambio vino de una asignación manual (HU-34,
// PATCH /lotes/:id/destino-productivo) o de aceptar/rechazar una
// recomendación ML (HU-49/HU-37, PATCH /recomendaciones/:id/responder).
// Espeja LoteDestinoHistorialResponseDto del backend (GET
// /lotes/:id/destino-productivo/historial, tabla lote_destino_historial).
//
// Reemplaza los dos stores en localStorage que existían antes de que este
// endpoint existiera (useDestinoProductivoManual.ts /
// useDestinoProductivoRecomendacion.ts, ya borrados) — ver
// useDestinoProductivoLote.ts.
export type OrigenDestinoHistorial = "manual" | "recomendacion_ml";

export interface DestinoHistorialItem {
  id: number;
  loteId: number;
  destinoProductivoId: number;
  destinoProductivoNombre: string;
  destinoAnteriorId: number | null;
  destinoAnteriorNombre: string | null;
  usuarioId: number;
  origen: OrigenDestinoHistorial;
  // Solo presente cuando origen = "recomendacion_ml": id de la
  // RecomendacionDestino que originó este cambio (ver
  // recomendacionDestino.types.ts / RecomendacionDestinoItem si hace falta
  // la justificación).
  recomendacionDestinoId: number | null;
  createdAt: string;
}
