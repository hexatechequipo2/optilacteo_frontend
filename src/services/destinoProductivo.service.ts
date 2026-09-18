import axios from "axios";
import api from "./api";
import type { DestinoProductivo } from "../types/destinoProductivo.types";

export const destinoProductivoService = {
  // GET /destinos-productivos: catálogo activo de la empresa del tenant
  // (DestinoProductivoController.findActivos en el backend).
  getActivos: async (): Promise<DestinoProductivo[]> => {
    const { data } = await api.get<DestinoProductivo[]>("/destinos-productivos");
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
