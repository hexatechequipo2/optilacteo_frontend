import axios from "axios";
import api from "./api";
import type { CreateSkuDto, Sku } from "../types/sku.types";

// GET /skus (SkuController.findAll -> SkuService.findAllActivosByEmpresa)
// TODO(backend): este endpoint no pagina ni acepta filtro por texto — solo
// devuelve TODOS los SKUs activos de la empresa, sin límite. Hoy el catálogo
// es chico y no importa, pero si crece el Select de la pantalla de Ingreso a
// cámara va a traer todo de una sola vez. Reportado al equipo de backend
// (ver resumen aparte), no se resuelve acá.
export const skuService = {
  getAll: async (): Promise<Sku[]> => {
    const { data } = await api.get<Sku[]>("/skus");
    return data;
  },

  // El backend valida unicidad de `nombre` por empresa y devuelve 409 si ya
  // existe (mensaje mostrado tal cual vía extraerMensajeError).
  create: async (dto: CreateSkuDto): Promise<Sku> => {
    const { data } = await api.post<Sku>("/skus", dto);
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
