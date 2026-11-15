import axios from "axios";
import api from "./api";
import type {
  Proveedor,
  CreateProveedorDto,
  PaginatedResponse,
  EstadoProveedor,
  CampoUnicoProveedor,
  ConflictoProveedorResponse,
} from "../types/proveedor.types";
import type { TipoProveedor } from "../types/proveedor.types";

interface GetAllParams {
  page: number;
  limit: number;
  tipo?: TipoProveedor;
  estado?: EstadoProveedor;
}

// El form lo muestra bajo el campo que ya está ocupado en la empresa.
export class ProveedorDuplicadoError extends Error {
  readonly field: CampoUnicoProveedor;

  constructor(field: CampoUnicoProveedor, message: string) {
    super(message);
    this.name = "ProveedorDuplicadoError";
    this.field = field;
  }
}

// Traduce el 409 de unicidad a ProveedorDuplicadoError; cualquier otro
// error (o un 409 sin field conocido) se relanza tal cual.
function relanzarConflicto(err: unknown): never {
  if (axios.isAxiosError<ConflictoProveedorResponse>(err) && err.response?.status === 409) {
    const { field, message } = err.response.data ?? {};
    if ((field === "cuit" || field === "razonSocial") && typeof message === "string") {
      throw new ProveedorDuplicadoError(field, message);
    }
  }
  throw err;
}

export const proveedoresService = {
  // Llama directo al endpoint con los params que el backend realmente soporta
  // (page, limit, tipo). No manda "search": eso se resuelve en el hook.
  getAll: async ({ page, limit, tipo, estado }: GetAllParams): Promise<PaginatedResponse<Proveedor>> => {
    const { data } = await api.get<PaginatedResponse<Proveedor>>("/proveedores", {
      params: {
        page,
        limit,
        ...(tipo && { tipo }),
        ...(estado && {estado})
      },
    });
    return data;
  },

  // HU-64: la ficha individual es la única respuesta que trae `estabilidad`.
  getById: async (id: number): Promise<Proveedor> => {
    const { data } = await api.get<Proveedor>(`/proveedores/${id}`);
    return data;
  },

  create: async (dto: CreateProveedorDto): Promise<Proveedor> => {
    try {
      const { data } = await api.post<Proveedor>("/proveedores", dto);
      return data;
    } catch (err) {
      relanzarConflicto(err);
    }
  },

  update: async (id: number, dto: Partial<CreateProveedorDto>): Promise<Proveedor> => {
    try {
      const { data } = await api.patch<Proveedor>(`/proveedores/${id}`, dto);
      return data;
    } catch (err) {
      relanzarConflicto(err);
    }
  },
};