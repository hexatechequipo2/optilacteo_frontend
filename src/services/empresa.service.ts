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

export interface EmpresaFilters {
  page?: number;
  limit?: number;
  name?: string;
  cuit?: string;
  isActive?: boolean;
  plan?: string;
}

export interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const empresasService = {
  /**
   * Trae todas las empresas registradas (solo Administrador).
   * Límite temporal fijo en 100 (el máximo permitido por el backend en
   * PaginationQueryDto). Si la cantidad real de empresas supera este
   * valor, van a faltar registros en la tabla de EmpresasPage.
   * Solución definitiva pendiente: implementar paginación real en la UI.
   */
  getAll: async (params: any): Promise<{ data: EmpresaType[], meta: Meta }> => {
    const { data } = await api.get<{ data: EmpresaType[], meta: Meta }>("/empresa", {
      params,
    });
    return data;
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

  /** HU-12: el Gerente edita el nombre de su propia empresa */
  updateIdentidad: async (name: string): Promise<EmpresaType> => {
    const { data } = await api.patch<EmpresaType>("/empresa/me/identidad", { name });
    return data;
  },

  /**
   * HU-12: sube (o reemplaza) el logo de la propia empresa. PNG/JPG, máx. 2MB.
   * No fijar el header Content-Type a mano: con FormData, el navegador tiene
   * que agregarle el boundary automáticamente. Si lo seteamos nosotros a
   * "multipart/form-data" sin boundary, axios lo respeta tal cual y el
   * backend no puede parsear el body (busboy/multer necesitan el boundary).
   */
  uploadLogo: async (file: File): Promise<EmpresaType> => {
    const formData = new FormData();
    formData.append("logo", file);
    const { data } = await api.post<EmpresaType>("/empresa/me/logo", formData);
    return data;
  },

  /** HU-12: elimina el logo de la propia empresa */
  deleteLogo: async (): Promise<EmpresaType> => {
    const { data } = await api.delete<EmpresaType>("/empresa/me/logo");
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