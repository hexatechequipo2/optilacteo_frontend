import api from "./api";
import type {
  Proveedor,
  CreateProveedorDto,
  PaginatedResponse,
} from "../types/proveedor.types";
import type { TipoProveedor } from "../types/proveedor.types";

interface GetAllParams {
  page: number;
  limit: number;
  tipo?: TipoProveedor;
}

export const proveedoresService = {
  // Llama directo al endpoint con los params que el backend realmente soporta
  // (page, limit, tipo). No manda "search": eso se resuelve en el hook.
  getAll: async ({ page, limit, tipo }: GetAllParams): Promise<PaginatedResponse<Proveedor>> => {
    const { data } = await api.get<PaginatedResponse<Proveedor>>("/proveedores", {
      params: {
        page,
        limit,
        ...(tipo && { tipo }),
      },
    });
    return data;
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