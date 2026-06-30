import { useCallback, useEffect, useState } from "react";
import { proveedoresService } from "../services/proveedores.service";
import type { Proveedor, CreateProveedorDto } from "../types/proveedor.types";

interface UseProveedoresResult {
  proveedores: Proveedor[];
  isLoading: boolean;
  error: string | null;
  fetchProveedores: () => Promise<void>;
  createProveedor: (dto: CreateProveedorDto) => Promise<void>;
  isCreating: boolean;
  updateProveedor: (id: number, dto: Partial<CreateProveedorDto>) => Promise<void>;
  isUpdating: boolean;
}

export function useProveedores(): UseProveedoresResult {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProveedores = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await proveedoresService.getAll();
      setProveedores(data);
    } catch {
      setError("No se pudieron cargar los proveedores.");
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    isLoading,
    error,
    fetchProveedores,
    createProveedor,
    isCreating,
    updateProveedor,
    isUpdating,
  };
}
