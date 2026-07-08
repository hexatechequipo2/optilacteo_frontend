import api from "./api";
import type {
  Proveedor,
  CreateProveedorDto,
  ProveedoresFilters,
} from "../types/proveedor.types";

export const proveedoresService = {
  /**
   * Límite fijo en 100 (el máximo permitido por PaginationQueryDto).
   * Con filtro/búsqueda server-side esto pesa mucho menos: al reducirse
   * el universo de resultados, es raro que se corten registros. Paginación
   * real en la UI sigue pendiente para cuando eso no alcance.
   */
  getAll: async (filters: ProveedoresFilters = {}, limit = 100): Promise<Proveedor[]> => {
    const { tipo, search } = filters;
    const { data } = await api.get<{ data: Proveedor[] }>("/proveedores", {
      params: {
        limit,
        ...(tipo && { tipo }),
        ...(search?.trim() && { search: search.trim() }),
      },
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