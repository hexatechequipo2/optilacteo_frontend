import api from "./api";
import type { RolType, UpdatePermisoDto, PermisoActualizadoType } from "../types/rol.types";

export async function getRoles(): Promise<RolType[]> {
  const { data } = await api.get("/rol");
  return data;
}

export async function updatePermiso(
  permisoId: number,
  payload: UpdatePermisoDto,
): Promise<PermisoActualizadoType> {
  const { data } = await api.patch(`/permiso/${permisoId}`, payload);
  return data;
}