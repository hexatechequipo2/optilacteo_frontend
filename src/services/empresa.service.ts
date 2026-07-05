import api from "./api";
import type { EmpresaType, UpdateEmpresaDto } from "../types/empresa.types";

export interface CreateEmpresaDto {
  name: string;
  cuit?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  plan: string;
}

export const empresasService = {
  /**
   * Trae todas las empresas registradas (solo Administrador).
   * Límite temporal fijo en 100 (el máximo permitido por el backend en
   * PaginationQueryDto). Si la cantidad real de empresas supera este
   * valor, van a faltar registros en la tabla de EmpresasPage.
   * Solución definitiva pendiente: implementar paginación real en la UI.
   */
  getAll: async (limit = 100): Promise<EmpresaType[]> => {
    const { data } = await api.get<{ data: EmpresaType[] }>("/empresa", {
      params: { limit },
    });
    return data.data;
  },

  /** Trae la empresa del usuario autenticado (Administrador o Gerente) */
  getMine: async (): Promise<EmpresaType> => {
    const { data } = await api.get<EmpresaType>("/empresa/me");
    return data;
  },

  /** Crea una nueva empresa */
  create: async (dto: CreateEmpresaDto): Promise<EmpresaType> => {
    const { data } = await api.post<EmpresaType>("/empresa", dto);
    return data;
  },

  /** Actualiza los datos de una empresa */
  update: async (id: number, dto: UpdateEmpresaDto): Promise<EmpresaType> => {
    const { data } = await api.patch<EmpresaType>(`/empresa/${id}`, dto);
    return data;
  },

  /** Activa una empresa suspendida */
  activate: async (id: number): Promise<EmpresaType> => {
    const { data } = await api.patch<EmpresaType>(`/empresa/${id}/activar`);
    return data;
  },

  /** Suspende una empresa — el backend rechaza si tiene usuarios activos */
  deactivate: async (id: number): Promise<EmpresaType> => {
    const { data } = await api.patch<EmpresaType>(`/empresa/${id}/desactivar`);
    return data;
  },
};