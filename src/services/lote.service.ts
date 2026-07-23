import axios from "axios";
import api from "./api";
import type {
  CreateLoteDto,
  Lote,
  LoteFilterQuery,
  PaginatedLotes,
} from "../types/lote.types";

// El backend valida existencia del proveedor, rangos de parámetros y unicidad
// del código directamente (404/400/409 con mensaje); no hace falta duplicar
// esas validaciones acá.
export const loteService = {
  // GET /lotes devuelve paginado ({data, total, page, limit}); pedimos un
  // límite alto porque hoy no hay UI de paginación en la pantalla de lotes.
  getAll: async (filters: LoteFilterQuery = {}): Promise<Lote[]> => {
    const { data } = await api.get<PaginatedLotes>("/lotes", {
      params: { limit: 100, ...filters },
    });
    return data.data;
  },

  // Pide 1 solo registro para leer el "total" del paginado sin traer todos
  // los lotes (mismo patrón que proveedoresService para el contador del sidebar).
  count: async (): Promise<number> => {
    const { data } = await api.get<PaginatedLotes>("/lotes", {
      params: { limit: 1 },
    });
    return data.total;
  },

  create: async (dto: CreateLoteDto): Promise<Lote> => {
    const { data } = await api.post<Lote>("/lotes", dto);
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
