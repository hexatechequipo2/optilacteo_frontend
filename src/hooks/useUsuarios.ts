import { useCallback, useEffect, useMemo, useState } from "react";
import { usuariosService } from "../services/usuarios.service";
import type {
  CreateUsuarioDto,
  UpdateUsuarioDto,
  UsuarioType,
} from "../types/usuario.types";

interface UseUsuariosResult {
  usuarios: UsuarioType[];
  filteredUsuarios: UsuarioType[];
  isLoading: boolean;
  error: string | null;
  search: string;
  setSearch: (value: string) => void;
  empresaFiltro: string;
  setEmpresaFiltro: (empresaId: string) => void;
  createUsuario: (payload: CreateUsuarioDto) => Promise<void>;
  isCreating: boolean;
  /**
   * Actualiza datos generales del usuario y, si el estado activo/inactivo
   * cambió respecto al actual, dispara el endpoint dedicado correspondiente.
   */
  updateUsuario: (
    id: number,
    payload: UpdateUsuarioDto,
    nuevoEstado: boolean,
  ) => Promise<void>;
  isUpdating: boolean;
  unlockUsuario: (id: number) => Promise<void>;
  isUnlocking: boolean;
  refetch: () => Promise<void>;
}

/** Valor especial para representar "todas las empresas" en el filtro */
export const TODAS_LAS_EMPRESAS = "todas";

export function useUsuarios(): UseUsuariosResult {
  const [usuarios, setUsuarios] = useState<UsuarioType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [empresaFiltro, setEmpresaFiltro] = useState(TODAS_LAS_EMPRESAS);

  const fetchUsuarios = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await usuariosService.getAll();
      setUsuarios(data);
    } catch {
      setError("No se pudieron cargar los usuarios. Intentá nuevamente.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const filteredUsuarios = useMemo(() => {
    const term = search.trim().toLowerCase();

    return usuarios.filter((usuario) => {
      const matchesEmpresa =
        empresaFiltro === TODAS_LAS_EMPRESAS ||
        String(usuario.empresa?.id) === empresaFiltro;

      if (!matchesEmpresa) return false;
      if (!term) return true;

      return (
        usuario.name.toLowerCase().includes(term) ||
        usuario.email.toLowerCase().includes(term) ||
        (usuario.empresa?.name ?? "").toLowerCase().includes(term)
      );
    });
  }, [usuarios, search, empresaFiltro]);

  const createUsuario = useCallback(
    async (payload: CreateUsuarioDto) => {
      setIsCreating(true);
      try {
        await usuariosService.create(payload);
        await fetchUsuarios();
      } finally {
        setIsCreating(false);
      }
    },
    [fetchUsuarios],
  );

  const updateUsuario = useCallback(
    async (id: number, payload: UpdateUsuarioDto, nuevoEstado: boolean) => {
      setIsUpdating(true);
      try {
        const usuarioActual = usuarios.find((u) => u.id === id);

        await usuariosService.update(id, payload);

        // El estado activo/inactivo se maneja con endpoints dedicados,
        // separados del PATCH genérico (no forma parte de UpdateUserDto).
        if (usuarioActual && usuarioActual.isActive !== nuevoEstado) {
          if (nuevoEstado) {
            await usuariosService.activate(id);
          } else {
            await usuariosService.deactivate(id);
          }
        }

        await fetchUsuarios();
      } finally {
        setIsUpdating(false);
      }
    },
    [usuarios, fetchUsuarios],
  );

  const unlockUsuario = useCallback(
    async (id: number) => {
      setIsUnlocking(true);
      try {
        await usuariosService.unlock(id);
        await fetchUsuarios();
      } finally {
        setIsUnlocking(false);
      }
    },
    [fetchUsuarios],
  );

  return {
    usuarios,
    filteredUsuarios,
    isLoading,
    error,
    search,
    setSearch,
    empresaFiltro,
    setEmpresaFiltro,
    createUsuario,
    isCreating,
    updateUsuario,
    isUpdating,
    unlockUsuario,
    isUnlocking,
    refetch: fetchUsuarios,
  };
}