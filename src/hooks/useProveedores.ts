import { useCallback, useEffect, useState } from "react";
import { proveedoresService } from "../services/proveedores.service";
import type {
  Proveedor,
  CreateProveedorDto,
  ProveedoresFilters,
} from "../types/proveedor.types";

interface ProveedoresMeta {
  total: number;
  lastPage: number;
}

interface UseProveedoresResult {
  proveedores: Proveedor[];
  meta: ProveedoresMeta;
  page: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  error: string | null;
  fetchProveedores: () => Promise<void>;
  createProveedor: (dto: CreateProveedorDto) => Promise<void>;
  isCreating: boolean;
  updateProveedor: (id: number, dto: Partial<CreateProveedorDto>) => Promise<void>;
  isUpdating: boolean;
}

const PAGE_SIZE = 3;
// Tope para traer el universo a filtrar en cliente cuando hay búsqueda,
// ya que el backend no soporta búsqueda multi-campo (mismo límite que
// usaba antes el frontend: el máximo de PaginationQueryDto).
const SEARCH_FETCH_LIMIT = 100;

function matchesSearch(p: Proveedor, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  const haystacks = [
    p.razonSocial,
    p.cuit,
    p.telefono,
    p.emailContacto,
    p.provincia,
    p.localidad,
  ];
  return haystacks.some((v) => (v ?? "").toLowerCase().includes(needle));
}

export function useProveedores(filters: ProveedoresFilters = {}): UseProveedoresResult {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [meta, setMeta] = useState<ProveedoresMeta>({ total: 0, lastPage: 1 });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { tipo, search } = filters;
  const hasSearch = !!search?.trim();

  // Si cambian los filtros, volvemos a la página 1
  useEffect(() => {
    setPage(1);
  }, [tipo, search]);

  const fetchProveedores = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (hasSearch) {
        // El backend no soporta búsqueda multi-campo: traemos un lote grande
        // (filtrado por tipo, que sí soporta) y filtramos/paginamos en cliente.
        const result = await proveedoresService.getAll({
          page: 1,
          limit: SEARCH_FETCH_LIMIT,
          tipo,
        });
        const filtrados = result.data.filter((p) => matchesSearch(p, search!));
        const start = (page - 1) * PAGE_SIZE;
        setProveedores(filtrados.slice(start, start + PAGE_SIZE));
        setMeta({
          total: filtrados.length,
          lastPage: Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE)),
        });
      } else {
        // Sin búsqueda: paginación real contra el backend
        const result = await proveedoresService.getAll({
          page,
          limit: PAGE_SIZE,
          tipo,
        });
        setProveedores(result.data);
        setMeta({
          total: result.meta.total,
          lastPage: result.meta.totalPages,
        });
      }
    } catch {
      setError("No se pudieron cargar los proveedores.");
    } finally {
      setIsLoading(false);
    }
  }, [tipo, search, hasSearch, page]);

  useEffect(() => {
    fetchProveedores();
  }, [fetchProveedores]);

  const createProveedor = useCallback(
    async (dto: CreateProveedorDto) => {
      setIsCreating(true);
      try {
        await proveedoresService.create(dto);
        await fetchProveedores();
      } finally {
        setIsCreating(false);
      }
    },
    [fetchProveedores],
  );

  const updateProveedor = useCallback(
    async (id: number, dto: Partial<CreateProveedorDto>) => {
      setIsUpdating(true);
      try {
        await proveedoresService.update(id, dto);
        await fetchProveedores();
      } finally {
        setIsUpdating(false);
      }
    },
    [fetchProveedores],
  );

  return {
    proveedores,
    meta,
    page,
    setPage,
    isLoading,
    error,
    fetchProveedores,
    createProveedor,
    isCreating,
    updateProveedor,
    isUpdating,
  };
}