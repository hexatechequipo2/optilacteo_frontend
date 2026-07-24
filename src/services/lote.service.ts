import axios from "axios";
import api from "./api";
import type {
  CreateLoteDto,
  Lote,
  LoteCreateResponse,
  LoteFilterQuery,
  PaginatedLotes,
  UpdateLoteDto,
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

  // Devuelve { lote, sensoresDisponibles }: los sensores activos ya
  // filtrados por la ubicacionInicial del lote, para ofrecer como
  // candidatos a asociar (ver LoteFormModal.tsx).
  create: async (dto: CreateLoteDto): Promise<LoteCreateResponse> => {
    const { data } = await api.post<LoteCreateResponse>("/lotes", dto);
    return data;
  },

  update: async (id: number, dto: UpdateLoteDto): Promise<Lote> => {
    const { data } = await api.patch<Lote>(`/lotes/${id}`, dto);
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
