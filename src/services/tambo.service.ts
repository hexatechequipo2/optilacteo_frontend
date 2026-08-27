import axios from "axios";
import api from "./api";
import type { Tambo, CreateTamboDto, UpdateTamboDto } from "../types/tambo.types";

// A diferencia de /proveedores, GET /tambos no está paginado (TamboService.
// findAll/findByProveedor en el backend devuelven el array completo, ya
// filtrado por activo:true y ordenado por nombre del lado del servidor).
export const tamboService = {
  getAll: async (): Promise<Tambo[]> => {
    const { data } = await api.get<Tambo[]>("/tambos");
    return data;
  },

  // GET /tambos?proveedorId=xxx — combo encadenado del form de alta de lote
  // (HU-36, comentario textual en tambo.controller.ts del backend: "select
  // encadenado del form de lote").
  getByProveedor: async (proveedorId: number): Promise<Tambo[]> => {
    const { data } = await api.get<Tambo[]>("/tambos", {
      params: { proveedorId },
    });
    return data;
  },

  // POST /tambos (TamboController.create): @Roles(OPERARIO_LINEA, GERENTE)
  // en el backend — Administrador y Responsable de Calidad NO pueden crear
  // tambos (ver gating de rol en TambosPage.tsx).
  create: async (dto: CreateTamboDto): Promise<Tambo> => {
    const { data } = await api.post<Tambo>("/tambos", dto);
    return data;
  },

  // PATCH /tambos/:id: solo nombre/ubicacion (ver UpdateTamboDto). @Roles(GERENTE, ADMINISTRADOR).
  update: async (id: number, dto: UpdateTamboDto): Promise<Tambo> => {
    const { data } = await api.patch<Tambo>(`/tambos/${id}`, dto);
    return data;
  },

  // PATCH /tambos/:id/activar — reactiva un tambo dado de baja. @Roles(GERENTE, ADMINISTRADOR).
  activar: async (id: number): Promise<Tambo> => {
    const { data } = await api.patch<Tambo>(`/tambos/${id}/activar`);
    return data;
  },

  // DELETE /tambos/:id — baja lógica (el backend nunca borra físicamente:
  // puede estar referenciado por lotes ya registrados). @Roles(GERENTE, ADMINISTRADOR).
  darDeBaja: async (id: number): Promise<Tambo> => {
    const { data } = await api.delete<Tambo>(`/tambos/${id}`);
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
