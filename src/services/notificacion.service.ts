import axios from "axios";
import api from "./api";
import type { Notificacion, NotificacionPaginada } from "../types/notificacion.types";

export interface NotificacionFilterQuery {
  page?: number;
  limit?: number;
}

export const notificacionService = {
  // Sin argumentos: page/limit por default del backend (1/20), como usa la
  // campana (Layout.tsx). HU-25 (pantalla de Alertas) pide un limit más
  // alto para no perder alertas recientes bajo paginación.
  getAll: async (query: NotificacionFilterQuery = {}): Promise<Notificacion[]> => {
    const { data } = await api.get<NotificacionPaginada>("/notificaciones", { params: query });
    return data.data;
  },

  marcarLeida: async (id: number): Promise<void> => {
    await api.patch(`/notificaciones/${id}/leida`);
  },
};

export function extraerMensajeError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    const { message } = err.response.data;
    return Array.isArray(message) ? message.join(" ") : message;
  }
  return fallback;
}
