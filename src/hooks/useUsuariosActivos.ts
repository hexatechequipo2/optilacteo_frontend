import { useEffect, useState } from "react";
import { usuariosService } from "../services/usuarios.service";
import type { UsuarioType } from "../types/usuario.types";

// HU-29: lista liviana (sin paginación de UI) de los usuarios activos de la
// propia empresa, para poblar el selector "asignar a usuario puntual" en
// Destinatarios de alertas. Mismo patrón que useRoles.ts. limit=100 porque
// es un combo, no una tabla paginada, pero PaginationQueryDto del backend
// tiene @Max(100) — pedir más tira 400 (bug ya visto una vez acá, ver
// PR/commit de este fix). GET /user ya filtra por empresaId vía JWT (ver
// comentario en sensor.service.ts).
export function useUsuariosActivos() {
  const [usuarios, setUsuarios] = useState<UsuarioType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const { data } = await usuariosService.getAll({
          page: 1,
          limit: 100,
          isActive: true,
        });
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
