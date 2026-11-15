import { mensajeErrorApi } from "../utils/mensajeErrorApi";
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
  return mensajeErrorApi(err, fallback);
}
