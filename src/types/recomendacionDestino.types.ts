import type { DestinoLote } from "./lote.types";

// HU-49 (Sprint 4): tipos de UI para la recomendación de destino productivo
// por ML. Todavía no existe el modelo ni el endpoint en el backend — no hay
// entidad equivalente ahí. Cuando se conecte, debería alcanzar con mapear la
// respuesta real a esta forma sin tocar RecomendacionDestinoCard.

export type NivelConfianzaRecomendacion = "alta" | "media" | "baja";

export interface RecomendacionDestinoIA {
  destinoSugerido: DestinoLote;
  confianza: number; // 0-100
  nivelConfianza: NivelConfianzaRecomendacion;
  lotesComparables: number;
}
