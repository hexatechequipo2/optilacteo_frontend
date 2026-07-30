import axios from "axios";
import api from "./api";
import type {
  CreateLoteDto,
  Lote,
  LoteCreateResponse,
  LoteFilterQuery,
  LoteRevision,
  PaginatedLotes,
  RevisarLoteDto,
  UpdateLoteDto,
} from "../types/lote.types";
import type { ComparacionHistoricaLote } from "../types/comparacionHistorica.types";

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

  // HU-22: bandeja dedicada de lotes No Apto sin revisión vigente (el
  // backend ya excluye acá los que ya fueron decididos y no se
  // reclasificaron de nuevo). No está paginado.
  getNoAptos: async (): Promise<Lote[]> => {
    const { data } = await api.get<Lote[]>("/lotes/no-aptos");
    return data;
  },

  // POST /lotes/:id/revision devuelve el lote actualizado completo (no solo
  // la decisión). El backend responde 400 si el lote ya no está en No Apto
  // y 409 si ya tiene una revisión vigente (justificaciones se muestran tal
  // cual vía extraerMensajeError).
  revisar: async (id: number, dto: RevisarLoteDto): Promise<Lote> => {
    const { data } = await api.post<Lote>(`/lotes/${id}/revision`, dto);
    return data;
  },

  getHistorialRevisiones: async (id: number): Promise<LoteRevision[]> => {
    const { data } = await api.get<LoteRevision[]>(`/lotes/${id}/revisiones`);
    return data;
  },

  // HU-24: comparación del lote contra el histórico de parámetros de la
  // empresa (ComparacionHistoricaResponseDto real en el backend).
  getComparacionHistorica: async (id: number): Promise<ComparacionHistoricaLote> => {
    const { data } = await api.get<ComparacionHistoricaLote>(
      `/lotes/${id}/comparacion-historica`,
    );
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
