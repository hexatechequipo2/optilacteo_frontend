import axios from "axios";
import api from "./api";
import type { Notificacion, NotificacionPaginada } from "../types/notificacion.types";
import type {
  ConfiguracionNotificacionNivel,
  ConfiguracionNotificacionNivelUsuario,
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

// HU-26/HU-29: configuración de destinatarios por nivel de alerta, por rol
// completo (rolId) o por usuario puntual (usuarioId). Mismo controller que
// notificacionService (NotificacionesController), sub-recurso
// /notificaciones/configuracion — restringido a Administrador/Gerente en
// el backend (ver NotificacionesController.listarConfiguracion et al.).
export const configuracionNotificacionService = {
  getAll: async (): Promise<ConfiguracionNotificacionNivel[]> => {
    const { data } = await api.get<ConfiguracionNotificacionNivel[]>(
      "/notificaciones/configuracion",
    );
    return data.map(sinPasswordDeUsuario);
  },

  create: async (
    dto: CrearConfiguracionNotificacionDto,
  ): Promise<ConfiguracionNotificacionNivel> => {
    const { data } = await api.post<ConfiguracionNotificacionNivel>(
      "/notificaciones/configuracion",
      dto,
    );
    return sinPasswordDeUsuario(data);
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/notificaciones/configuracion/${id}`);
  },
};

// Mitigación en el frontend de un bug de seguridad del backend: el GET/POST
// de /notificaciones/configuracion embebe la entidad `User` completa,
// incluyendo el hash de password (no hay mapper de salida para este
// endpoint). No hay forma de pedirle al backend que no lo mande, así que
// lo descartamos acá antes de que ese dato entre al estado de React (y de
// paso a cualquier log/devtools). Esto NO reemplaza el fix real, que debe
// hacerse en el backend (ver aviso aparte para el equipo).
function sinPasswordDeUsuario(
  config: ConfiguracionNotificacionNivel,
): ConfiguracionNotificacionNivel {
  if (!config.usuario) return config;
  const { id, name, email } = config.usuario as ConfiguracionNotificacionNivelUsuario & {
    password?: string;
  };
  return { ...config, usuario: { id, name, email } };
}

export function extraerMensajeError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    const { message } = err.response.data;
    return Array.isArray(message) ? message.join(" ") : message;
  }
  return fallback;
}
