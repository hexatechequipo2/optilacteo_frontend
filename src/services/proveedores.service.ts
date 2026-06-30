import api from "./api";
import type { Proveedor, CreateProveedorDto } from "../types/proveedor.types";

export const proveedoresService = {
  getAll: async (): Promise<Proveedor[]> => {
    const { data } = await api.get<Proveedor[]>("/proveedores");
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
