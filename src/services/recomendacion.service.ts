import axios from "axios";
import api from "./api";
import type {
  RecomendacionDestinoIA,
  RecomendacionDestinoItem,
  ResponderRecomendacionDto,
} from "../types/recomendacionDestino.types";

export const recomendacionService = {
  // GET /recomendaciones/lote/:loteId: 200 con la recomendación pendiente,
  // o 200 con body vacío (Content-Length: 0) si no hay ninguna — NO es un
  // 404. axios no rompe acá: su transformResponse por defecto solo intenta
  // JSON.parse si `data` es truthy (ver node_modules/axios defaults.js),
  // así que un body vacío llega como "" sin lanzar.
  getPendientePorLote: async (
    loteId: number,
  ): Promise<RecomendacionDestinoIA | null> => {
    const { data } = await api.get<RecomendacionDestinoIA | "">(
      `/recomendaciones/lote/${loteId}`,
    );
    return data ? data : null;
  },

  // OJO: el backend devuelve acá la entidad RecomendacionDestino cruda
  // (ml.service.ts: responderRecomendacion), no el DTO mapeado de arriba —
  // no trae la relación destinoRecomendado cargada. No confiar en el body
  // de esta respuesta para leer el destino; ver useRecomendacionDestino.
  responder: async (
    id: number,
    dto: ResponderRecomendacionDto,
  ): Promise<void> => {
    await api.patch(`/recomendaciones/${id}/responder`, dto);
  },

  // HU-37: todas las recomendaciones de la empresa (cualquier estado), con
  // justificación incluida. No hay GET /recomendaciones/:id puntual ni
  // filtro por loteId en el backend — se trae la lista completa y se filtra
  // acá (ver useDestinoProductivoLote.ts y LotesPage.tsx). Si el volumen de
  // recomendaciones de una empresa crece mucho, esto debería paginarse o
  // filtrarse del lado del servidor.
  getTodas: async (): Promise<RecomendacionDestinoItem[]> => {
    const { data } = await api.get<RecomendacionDestinoItem[]>("/recomendaciones/todas");
    return data;
  },
};

export function extraerMensajeError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    const { message } = err.response.data;
    return Array.isArray(message) ? message.join(" ") : message;
  }
  return fallback;
}
