import { useEffect, useState } from "react";
import type { RolType, UpdatePermisoDto } from "../types/rol.types";
import { getRoles, updatePermiso as updatePermisoService } from "../services/rol.service";

export function useRoles() {
  const [roles, setRoles] = useState<RolType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRoles = async () => {
    try {
      setIsLoading(true);
      const data = await getRoles();
      setRoles(data);
    } catch {
      setError("No se pudieron cargar los roles.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const updatePermiso = async (rolId: number, payload: UpdatePermisoDto) => {
    const rolActualizado = await updatePermisoService(rolId, payload);
    setRoles((prev) =>
      prev.map((rol) => (rol.id === rolId ? rolActualizado : rol)),
    );
  };

  return { roles, isLoading, error, updatePermiso };
}