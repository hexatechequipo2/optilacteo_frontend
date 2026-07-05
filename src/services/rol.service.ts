import api from "./api";
import type { RolType, UpdatePermisoDto } from "../types/rol.types";

export async function getRoles(): Promise<RolType[]> {
  const { data } = await api.get("/rol");
  return data;
}

export async function updatePermiso(
  rolId: number,
  payload: UpdatePermisoDto,
): Promise<RolType> {
  const { data } = await api.patch(`/rol/${rolId}/permisos`, payload);
  return data;
}