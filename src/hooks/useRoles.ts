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

  const updatePermiso = async (permisoId: number, payload: UpdatePermisoDto) => {
    const permisoActualizado = await updatePermisoService(permisoId, payload);

    setRoles((prev) =>
      prev.map((rol) => {
        if (rol.id !== permisoActualizado.rol.id) return rol;
        return {
          ...rol,
          permisos: rol.permisos.map((p) =>
            p.id === permisoActualizado.id
              ? {
                  id: permisoActualizado.id,
                  modulo: permisoActualizado.modulo,
                  canRead: permisoActualizado.canRead,
                  canWrite: permisoActualizado.canWrite,
                }
              : p,
          ),
        };
      }),
    );
  };

  return { roles, isLoading, error, updatePermiso };
}