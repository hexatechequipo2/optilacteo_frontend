import api from "./api";
import type { Proveedor, CreateProveedorDto } from "../types/proveedor.types";

export const proveedoresService = {
  /**
   * Límite temporal fijo en 100 (el máximo permitido por el backend en
   * PaginationQueryDto). Si la cantidad real de proveedores supera este
   * valor, van a faltar registros en la tabla de ProveedoresPage.
   * Solución definitiva pendiente: implementar paginación real en la UI.
   */
  getAll: async (limit = 100): Promise<Proveedor[]> => {
    const { data } = await api.get<{ data: Proveedor[] }>("/proveedores", {
      params: { limit },
    });
    return data.data;
  },

  create: async (dto: CreateProveedorDto): Promise<Proveedor> => {
    const { data } = await api.post<Proveedor>("/proveedores", dto);
    return data;
  },

  update: async (id: number, dto: Partial<CreateProveedorDto>): Promise<Proveedor> => {
    const { data } = await api.patch<Proveedor>(`/proveedores/${id}`, dto);
    return data;
  },
};
