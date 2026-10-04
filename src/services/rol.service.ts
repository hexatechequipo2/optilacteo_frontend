import axios from "axios";
import api from "./api";
import type {
  AsignarRolResponse,
  GuardarRolDto,
  RolGuardadoResponse,
  RolType,
} from "../types/rol.types";

// Todo bajo el módulo gestion_roles (rol.controller.ts). Las protecciones
// (Administrador, catálogo, rol con usuarios, autobloqueo, empresa sin
// gestor) vuelven como 409 con mensaje: se muestran con extraerMensajeError.
// empresaId: solo para el Administrador (obligatorio para él, ?empresaId=);
// un usuario de empresa lo omite y opera siempre sobre la suya.
const conEmpresa = (empresaId?: number) =>
  empresaId === undefined ? undefined : { params: { empresaId } };

export const rolService = {
  // gestion_roles:ver
  getAll: async (empresaId?: number): Promise<RolType[]> => {
    const { data } = await api.get<RolType[]>("/roles", conEmpresa(empresaId));
    return data;
  },
  // gestion_roles:crear
  create: async (dto: GuardarRolDto, empresaId?: number): Promise<RolGuardadoResponse> => {
    const { data } = await api.post<RolGuardadoResponse>("/roles", dto, conEmpresa(empresaId));
    return data;
  },
  // gestion_roles:editar (reemplaza la matriz completa del rol)
  update: async (
    id: number,
    dto: GuardarRolDto,
    empresaId?: number,
  ): Promise<RolGuardadoResponse> => {
    const { data } = await api.put<RolGuardadoResponse>(`/roles/${id}`, dto, conEmpresa(empresaId));
    return data;
  },
  // gestion_roles:eliminar
  remove: async (id: number, empresaId?: number): Promise<void> => {
    await api.delete(`/roles/${id}`, conEmpresa(empresaId));
  },
  // gestion_roles:editar
  asignar: async (
    usuarioId: number,
    rolId: number,
    empresaId?: number,
  ): Promise<AsignarRolResponse> => {
    const { data } = await api.put<AsignarRolResponse>(
      `/roles/usuarios/${usuarioId}`,
      { rolId },
      conEmpresa(empresaId),
    );
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
