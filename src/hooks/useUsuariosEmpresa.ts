import { useEffect, useState } from "react";
import { usuariosService } from "../services/usuarios.service";
import type { UsuarioType } from "../types/usuario.types";

// HU-43: usuarios de la propia empresa (activos e inactivos: uno dado de
// baja sigue apareciendo en el log) para el filtro "Usuario" de Auditoría.
// Mismo patrón que useUsuariosActivos.ts pero sin isActive: sin ese param
// GET /user no filtra por estado (user.repository.ts, findAllPaginated).
// limit=100 por el @Max(100) de PaginationQueryDto. GET /user ya filtra por
// empresaId vía JWT.
export function useUsuariosEmpresa() {
  const [usuarios, setUsuarios] = useState<UsuarioType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const { data } = await usuariosService.getAll({ page: 1, limit: 100 });
        if (!cancelado) setUsuarios(data);
      } catch {
        if (!cancelado) setError("No se pudieron cargar los usuarios.");
      } finally {
        if (!cancelado) setIsLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  return { usuarios, isLoading, error };
}
