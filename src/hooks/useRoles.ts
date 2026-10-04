import { useCallback, useEffect, useState } from "react";
import type { GuardarRolDto, RolType } from "../types/rol.types";
import { rolService } from "../services/rol.service";
import { useAuth } from "./useAuth";
import { usePermisos } from "./usePermisos";

interface UseRolesOptions {
  // false: no pide GET /roles (sin gestion_roles:ver daría 403).
  habilitado?: boolean;
  // Solo Administrador: empresa sobre la que opera (?empresaId=). Sin ella
  // el back responde 400, así que no se pide nada hasta que la elija.
  empresaId?: number;
}

// Las mutaciones no se tragan los errores: los 409 del back (protecciones)
// los muestra cada componente con extraerMensajeError. Si el cambio toca el
// rol del propio usuario, recarga sus permisos para que el menú lo refleje.
export function useRoles({ habilitado = true, empresaId }: UseRolesOptions = {}) {
  const { user } = useAuth();
  const { recargar, esSistema } = usePermisos();
  const activo = habilitado && (!esSistema || empresaId !== undefined);
  const empresaParam = esSistema ? empresaId : undefined;
  const [roles, setRoles] = useState<RolType[]>([]);
  const [isLoading, setIsLoading] = useState(activo);
  const [error, setError] = useState("");

  const refetch = useCallback(async () => {
    if (!activo) {
      setRoles([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      setRoles(await rolService.getAll(empresaParam));
    } catch {
      setError("No se pudieron cargar los roles.");
    } finally {
      setIsLoading(false);
    }
  }, [activo, empresaParam]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const crearRol = useCallback(
    async (dto: GuardarRolDto) => {
      const creado = await rolService.create(dto, empresaParam);
      await refetch();
      return creado;
    },
    [refetch, empresaParam],
  );

  const actualizarRol = useCallback(
    async (id: number, dto: GuardarRolDto) => {
      const actualizado = await rolService.update(id, dto, empresaParam);
      await refetch();
      if (id === user?.rolId) await recargar();
      return actualizado;
    },
    [refetch, recargar, user?.rolId, empresaParam],
  );

  const eliminarRol = useCallback(
    async (id: number) => {
      await rolService.remove(id, empresaParam);
      await refetch();
    },
    [refetch, empresaParam],
  );

  const asignarRol = useCallback(
    async (usuarioId: number, rolId: number) => {
      const resultado = await rolService.asignar(usuarioId, rolId, empresaParam);
      // Cambia el conteo de usuarios por rol.
      await refetch();
      if (usuarioId === user?.id) await recargar();
      return resultado;
    },
    [refetch, recargar, user?.id, empresaParam],
  );

  return { roles, isLoading, error, refetch, crearRol, actualizarRol, eliminarRol, asignarRol };
}
