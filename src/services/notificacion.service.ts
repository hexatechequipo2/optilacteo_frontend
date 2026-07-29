import axios from "axios";
import api from "./api";
import type { Notificacion } from "../types/notificacion.types";

export const notificacionService = {
  getAll: async (): Promise<Notificacion[]> => {
    const { data } = await api.get<Notificacion[]>("/notificaciones");
    return data;
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
