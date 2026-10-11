import api from "./api";
import type { MisPermisos } from "../types/permisos.types";

export async function getMisPermisos(): Promise<MisPermisos> {
  const { data } = await api.get<MisPermisos>("/auth/me/permisos");
  // Una respuesta con otra forma no puede llegar al estado: puede() y la
  // comparación de recargas asumen el array de permisos.
  if (!data || typeof data.esSistema !== "boolean" || !Array.isArray(data.permisos)) {
    throw new Error("Respuesta inválida de /auth/me/permisos");
  }
  return data;
}
