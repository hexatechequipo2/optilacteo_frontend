import api from "./api";
import type {
  CreateUsuarioDto,
  UpdateUsuarioDto,
  UsuarioType,
} from "../types/usuario.types";

export const usuariosService = {
  /** Trae todos los usuarios de la plataforma (todas las empresas) */
  getAll: async (params: {
  page: number;
  limit: number;
  name?: string;
  email?: string;
  empresaId?: string | number;
  // HU-29: filtro para poblar el selector de "asignar a usuario puntual"
  // en Destinatarios de alertas — solo tiene sentido ofrecer usuarios
  // activos como destinatario.
  isActive?: boolean;
}) => {
  const { data } = await api.get("/user", { params });
  return data;
},

  create: async (payload: CreateUsuarioDto): Promise<UsuarioType> => {
    const { data } = await api.post<UsuarioType>("/user", payload);
    return data;
  },

  update: async (
    id: number,
    payload: UpdateUsuarioDto,
  ): Promise<UsuarioType> => {
    const { data } = await api.patch<UsuarioType>(`/user/${id}`, payload);
    return data;
  },

  activate: async (id: number): Promise<UsuarioType> => {
    const { data } = await api.patch<UsuarioType>(`/user/${id}/activar`);
    return data;
  },

  deactivate: async (id: number): Promise<UsuarioType> => {
    const { data } = await api.patch<UsuarioType>(`/user/${id}/desactivar`);
    return data;
  },

  unlock: async (id: number): Promise<UsuarioType> => {
    const { data } = await api.patch<UsuarioType>(`/user/${id}/desbloquear`);
    return data;
  },
};