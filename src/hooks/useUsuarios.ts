import { useCallback, useEffect, useState } from "react";
import { usuariosService } from "../services/usuarios.service";
import type {
  CreateUsuarioDto,
  UpdateUsuarioDto,
  UsuarioType,
} from "../types/usuario.types";

export const TODAS_LAS_EMPRESAS = "todas";

// Definimos una interfaz para los parámetros de búsqueda
interface UserQueryParams {
  page: number;
  limit: number;
  name?: string;
  email?: string;
  empresaId?: number;
}

export function useUsuarios() {
  const [usuarios, setUsuarios] = useState<UsuarioType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [empresaFiltro, setEmpresaFiltro] = useState(TODAS_LAS_EMPRESAS);
  const [meta, setMeta] = useState({ total: 0, lastPage: 1 });

  const fetchUsuarios = useCallback(async () => {
  setIsLoading(true);
  setError(null);

  const params: UserQueryParams = {
    page,
    limit: 3,
    ...(search.trim() && { name: search.trim() }), // Sintaxis limpia
    ...(empresaFiltro !== TODAS_LAS_EMPRESAS && { empresaId: Number(empresaFiltro) }),
  };

  try {
    const response = await usuariosService.getAll(params);
    setUsuarios(response.data);
    setMeta({
      total: response.meta.total,
      lastPage: response.meta.totalPages, // <-- mapeo acá
    });
  } catch (err) {
    setError("Error al cargar usuarios.");
  } finally {
    setIsLoading(false);
  }
}, [page, search, empresaFiltro]); // <--- ESTO ES VITAL

useEffect(() => {
  fetchUsuarios();
}, [fetchUsuarios]);

  const handleFilterChange = (value: string) => {
    setEmpresaFiltro(value);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const createUsuario = useCallback(async (payload: CreateUsuarioDto) => {
    setIsCreating(true);
    try {
      await usuariosService.create(payload);
      await fetchUsuarios();
    } finally {
      setIsCreating(false);
    }
  }, [fetchUsuarios]);

  const updateUsuario = useCallback(async (id: number, payload: UpdateUsuarioDto, nuevoEstado: boolean) => {
    setIsUpdating(true);
    try {
      const usuarioActual = usuarios.find((u) => u.id === id);
      await usuariosService.update(id, payload);

      if (usuarioActual && usuarioActual.isActive !== nuevoEstado) {
        if (nuevoEstado) await usuariosService.activate(id);
        else await usuariosService.deactivate(id);
      }
      await fetchUsuarios();
    } finally {
      setIsUpdating(false);
    }
  }, [usuarios, fetchUsuarios]);

  const unlockUsuario = useCallback(async (id: number) => {
    setIsUnlocking(true);
    try {
      await usuariosService.unlock(id);
      await fetchUsuarios();
    } finally {
      setIsUnlocking(false);
    }
  }, [fetchUsuarios]);

  return {
    usuarios,
    meta,
    page,
    setPage,
    isLoading,
    error,
    search,
    setSearch: handleSearchChange,
    empresaFiltro,
    setEmpresaFiltro: handleFilterChange,
    createUsuario,
    isCreating,
    updateUsuario,
    isUpdating,
    unlockUsuario,
    isUnlocking,
    refetch: fetchUsuarios,
  };
}