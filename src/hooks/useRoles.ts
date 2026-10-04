import { useCallback, useEffect, useState } from "react";
import type { GuardarRolDto, RolType } from "../types/rol.types";
import { rolService } from "../services/rol.service";
import { useAuth } from "./useAuth";
import { usePermisos } from "./usePermisos";

interface UseRolesOptions {
  // false: no pide GET /roles (sin gestion_roles:ver daría 403).
  habilitado?: boolean;
}

// Las mutaciones no se tragan los errores: los 409 del back (protecciones)
// los muestra cada componente con extraerMensajeError. Si el cambio toca el
// rol del propio usuario, recarga sus permisos para que el menú lo refleje.
export function useRoles({ habilitado = true }: UseRolesOptions = {}) {
  const { user } = useAuth();
  const { recargar } = usePermisos();
  const [roles, setRoles] = useState<RolType[]>([]);
  const [isLoading, setIsLoading] = useState(habilitado);
  const [error, setError] = useState("");

  const refetch = useCallback(async () => {
    if (!habilitado) {
      setRoles([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      setRoles(await rolService.getAll());
    } catch {
      setError("No se pudieron cargar los roles.");
    } finally {
      setIsLoading(false);
    }
  }, [habilitado]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const crearRol = useCallback(
    async (dto: GuardarRolDto) => {
      const creado = await rolService.create(dto);
      await refetch();
      return creado;
    },
    [refetch],
  );

  const actualizarRol = useCallback(
    async (id: number, dto: GuardarRolDto) => {
      const actualizado = await rolService.update(id, dto);
      await refetch();
      if (id === user?.rolId) await recargar();
      return actualizado;
    },
    [refetch, recargar, user?.rolId],
  );

  const eliminarRol = useCallback(
    async (id: number) => {
      await rolService.remove(id);
      await refetch();
    },
    [refetch],
  );

  const asignarRol = useCallback(
    async (usuarioId: number, rolId: number) => {
      const resultado = await rolService.asignar(usuarioId, rolId);
      // Cambia el conteo de usuarios por rol.
      await refetch();
      if (usuarioId === user?.id) await recargar();
      return resultado;
    },
    [refetch, recargar, user?.id],
  );

  return { roles, isLoading, error, refetch, crearRol, actualizarRol, eliminarRol, asignarRol };
}
