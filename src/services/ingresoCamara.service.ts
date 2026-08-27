import axios from "axios";
import api from "./api";
import type {
  CreateIngresoCamaraDto,
  IngresoCamara,
  IngresoCamaraFilterQuery,
  PaginatedIngresosCamara,
} from "../types/ingresoCamara.types";

// GET /ingresos-camara pagina (igual que /lotes); pedimos un límite alto
// porque hoy no hay UI de paginación en esta pantalla (mismo criterio que
// loteService.getAll).
export const ingresoCamaraService = {
  getAll: async (filters: IngresoCamaraFilterQuery = {}): Promise<IngresoCamara[]> => {
    const { data } = await api.get<PaginatedIngresosCamara>("/ingresos-camara", {
      params: { limit: 100, ...filters },
    });
    return data.data;
  },

  // El backend valida que el SKU exista, pertenezca a la empresa y esté
  // activo (404 si no), y que el lote (si viene loteId) exista y pertenezca
  // a la empresa (404 si no). Mensajes mostrados vía extraerMensajeError.
  create: async (dto: CreateIngresoCamaraDto): Promise<IngresoCamara> => {
    const { data } = await api.post<IngresoCamara>("/ingresos-camara", dto);
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
