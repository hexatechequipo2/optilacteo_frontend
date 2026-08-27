import axios from "axios";
import api from "./api";
import type {
  CreateLoteDto,
  FinalizarLoteDto,
  Lote,
  LoteCreateResponse,
  LoteFilterQuery,
  LoteRevision,
  PaginatedLotes,
  RevisarLoteDto,
  UpdateLoteDto,
} from "../types/lote.types";
import type { ComparacionHistoricaLote } from "../types/comparacionHistorica.types";
import type { DesvioProveedorLote } from "../types/desvioProveedor.types";
import type { TrazabilidadLoteResponse } from "../types/trazabilidad.types";

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

  // PATCH /lotes/:id/finalizar (lote.controller.ts): HU-62 amplió el rol
  // habilitado a Responsable de calidad y Responsable de Producción (antes
  // exclusivo de calidad). Cierra el ciclo de vida del lote (estado ->
  // finalizado); no hay endpoint inverso. El body es opcional: solo se
  // envía `rendimiento` si el usuario lo cargó en el modal.
  finalizar: async (id: number, dto?: FinalizarLoteDto): Promise<Lote> => {
    const { data } = await api.patch<Lote>(`/lotes/${id}/finalizar`, dto);
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

  // HU-66: histórico de desvíos comprometido (remito) vs. real de un
  // proveedor. El backend filtra solo lotes con cantidadComprometidaKg
  // cargado (array vacío si no hay desvíos, 404 si el proveedor no existe o
  // es de otra empresa — extraerMensajeError ya cubre ese caso).
  getDesviosPorProveedor: async (proveedorId: number): Promise<DesvioProveedorLote[]> => {
    const { data } = await api.get<DesvioProveedorLote[]>(
      `/lotes/proveedor/${proveedorId}/desvios`,
    );
    return data;
  },

  // HU-32: historial completo e inmutable de trazabilidad del lote —
  // recepción, clasificaciones, revisiones de calidad, cambios de
  // ubicación, ingresos a cámara, consumos parciales y finalización, ya
  // ordenado cronológicamente por el backend. 404 si el id no existe o es
  // de otra empresa (propagado tal cual vía extraerMensajeError, ver
  // useTrazabilidadLote).
  getTrazabilidad: async (id: number): Promise<TrazabilidadLoteResponse> => {
    const { data } = await api.get<TrazabilidadLoteResponse>(`/lotes/${id}/trazabilidad`);
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
