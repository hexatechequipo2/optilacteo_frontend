import axios from "axios";
import { serializarRangoCalendario } from "../utils/fechaCalendario";
import api from "./api";
import type {
  EvolucionIndicadoresQuery,
  EvolucionIndicadoresResponse,
} from "../types/indicadorEvolucion.types";

// HU-39 (EP-7): GET /dashboard/indicadores/evolucion (optilacteo-backend,
// dashboard.controller.ts / dashboard.service.ts, PR #134 mergeado a
// develop). "indicadores" viaja como CSV en un solo query param
// (?indicadores=grasa,proteina), tal como lo documenta
// EvolucionIndicadoresQueryDto — así no depende de cómo axios/Express
// terminen serializando un array de query params.
// "desde"/"hasta" solo se mandan con periodo="rango" (el backend los ignora
// para los demás períodos, pero no tiene sentido mandarlos igual).
export const evolucionIndicadoresService = {
  getEvolucion: async (
    query: EvolucionIndicadoresQuery,
  ): Promise<EvolucionIndicadoresResponse> => {
    const { periodo, indicadores, desde, hasta } = query;
    const { data } = await api.get<EvolucionIndicadoresResponse>(
      "/dashboard/indicadores/evolucion",
      {
        params: {
          periodo,
          indicadores: indicadores.join(","),
          // HU-75: días calendario inclusivos, sin pasar por Date.
          ...(periodo === "rango"
            ? serializarRangoCalendario({ desde: desde ?? "", hasta: hasta ?? "" })
            : {}),
        },
      },
    );
    return data;
  },
};

// HU-75: un 400 es un error de validación de la consulta (se muestra el
// mensaje del backend, reintentar daría lo mismo); cualquier otra falla
// (red caída, 5xx) es un error de consulta que sí vale la pena reintentar.
export function esErrorValidacion(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 400;
}
