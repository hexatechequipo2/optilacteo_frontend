import type { DestinoProductivo } from "./destinoProductivo.types";

// HU-49: tipos de UI para la recomendación de destino productivo por ML.
// Espeja RecomendacionPendienteResponseDto del backend (GET
// /recomendaciones/lote/:loteId, ver ml/dto/recomendacion-pendiente-
// response.dto.ts). El backend no manda "lotesComparables" ni un nivel de
// confianza — eso lo inventó un mock de UI anterior; se derivan acá.
export type EstadoRecomendacion = "pendiente" | "aceptada" | "rechazada";

export interface RecomendacionDestinoIA {
  id: number;
  destinoRecomendado: DestinoProductivo;
  confianza: number; // 0-100
  estado: EstadoRecomendacion;
  destinoReal: DestinoProductivo | null;
}

export type NivelConfianzaRecomendacion = "alta" | "media" | "baja";

// Cortes de confianza para el badge de la tarjeta: decisión de UI, el
// backend solo manda `confianza` como número 0-100. Documentado acá para
// que quede a la vista si se quiere ajustar en el futuro.
export const CORTE_NIVEL_CONFIANZA = {
  ALTA: 80, // confianza >= 80 -> "alta"
  MEDIA: 50, // confianza >= 50 y < 80 -> "media"; < 50 -> "baja"
} as const;

export function derivarNivelConfianza(confianza: number): NivelConfianzaRecomendacion {
  if (confianza >= CORTE_NIVEL_CONFIANZA.ALTA) return "alta";
  if (confianza >= CORTE_NIVEL_CONFIANZA.MEDIA) return "media";
  return "baja";
}

export interface ResponderRecomendacionDto {
  aceptada: boolean;
  destinoRealId?: number; // requerido solo si aceptada = false
  // HU-37: requerida por el backend (MinLength 20, ver
  // responder-recomendacion.dto.ts) cuando aceptada = false. Si no viaja,
  // el PATCH /recomendaciones/:id/responder responde 400.
  justificacion?: string;
}

// HU-37: espeja el objeto que devuelve GET /recomendaciones/todas
// (ml.service.ts: obtenerTodas) — todas las recomendaciones de la empresa,
// en cualquier estado, con la justificación incluida cuando la tuvo. Se usa
// para reconstruir el "por qué" de una divergencia ya resuelta (ver
// useDestinoProductivoLote.ts), porque /recomendaciones/lote/:loteId solo
// devuelve la recomendación mientras está pendiente.
//
// OJO: no trae loteConsumoId — si el lote tuvo recomendaciones generadas
// por un consumo parcial posterior (HU-68), quedan mezcladas acá bajo el
// mismo loteId sin forma de distinguirlas desde el frontend.
export interface RecomendacionDestinoItem {
  recomendacionId: number;
  loteId: number;
  loteCodigo: string;
  estado: EstadoRecomendacion;
  destinoRecomendadoId: number;
  destinoRecomendadoNombre: string | null;
  destinoRealId: number | null;
  destinoRealNombre: string | null;
  confianza: number;
  justificacion: string | null;
  usuarioId: number | null;
  createdAt: string;
  respondidaEn: string | null;
}
