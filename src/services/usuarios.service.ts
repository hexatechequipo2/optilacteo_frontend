import api from "./api";
import type {
  CreateUsuarioDto,
  UpdateUsuarioDto,
  UsuarioType,
} from "../types/usuario.types";

export const usuariosService = {
  /** Trae todos los usuarios de la plataforma (todas las empresas) */
  getAll: async (): Promise<UsuarioType[]> => {
    const { data } = await api.get<UsuarioType[]>("/user");
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