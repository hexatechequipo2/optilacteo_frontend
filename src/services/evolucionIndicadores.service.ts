import axios from "axios";
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
          ...(periodo === "rango" ? { desde, hasta } : {}),
        },
      },
    );
    return data;
  },
};

// Mismo helper que tambo.service.ts / medicionManual.service.ts / etc:
// el backend responde 400 con mensaje descriptivo para rango inválido
// (hasta < desde) o falta de indicadores — se lo pasa tal cual al usuario
// en vez de un genérico, así se cumple el criterio de prueba de HU-39
// ("mostrar el error que devuelve el back, no romper").
export function extraerMensajeError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    const { message } = err.response.data;
    return Array.isArray(message) ? message.join(" ") : message;
  }
  return fallback;
}
