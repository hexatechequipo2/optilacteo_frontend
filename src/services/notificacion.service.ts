import axios from "axios";
import api from "./api";
import type { Notificacion, NotificacionPaginada } from "../types/notificacion.types";
import type {
  ConfiguracionNotificacionNivel,
  CrearConfiguracionNotificacionDto,
} from "../types/configuracionNotificacion.types";

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

// HU-26: configuración de destinatarios por nivel de alerta (nivel -> rol).
// Mismo controller que notificacionService (NotificacionesController), sub-
// recurso /notificaciones/configuracion — restringido a Gerente/Administrador
// en el backend (ver NotificacionesController.listarConfiguracion et al.).
export const configuracionNotificacionService = {
  getAll: async (): Promise<ConfiguracionNotificacionNivel[]> => {
    const { data } = await api.get<ConfiguracionNotificacionNivel[]>(
      "/notificaciones/configuracion",
    );
    return data;
  },

  create: async (
    dto: CrearConfiguracionNotificacionDto,
  ): Promise<ConfiguracionNotificacionNivel> => {
    const { data } = await api.post<ConfiguracionNotificacionNivel>(
      "/notificaciones/configuracion",
      dto,
    );
    return data;
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/notificaciones/configuracion/${id}`);
  },
};

export function extraerMensajeError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    const { message } = err.response.data;
    return Array.isArray(message) ? message.join(" ") : message;
  }
  return fallback;
}
