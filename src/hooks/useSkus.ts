import { useCallback, useEffect, useState } from "react";
import { skuService } from "../services/sku.service";
import type { CreateSkuDto, Sku } from "../types/sku.types";

interface UseSkusResult {
  skus: Sku[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createSku: (dto: CreateSkuDto) => Promise<Sku>;
  isCreating: boolean;
}

// Mismo esqueleto que useConfigParametros: sin refetch completo al crear,
// inserta el SKU nuevo y reordena por nombre (igual criterio que
// SkuService.findAllActivosByEmpresa en el backend, que ordena por
// nombre ASC).
export function useSkus(): UseSkusResult {
  const [skus, setSkus] = useState<Sku[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchSkus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await skuService.getAll();
      setSkus(result);
    } catch {
      setError("No se pudo cargar el catálogo de SKUs.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSkus();
  }, [fetchSkus]);

  const createSku = useCallback(async (dto: CreateSkuDto) => {
    setIsCreating(true);
    try {
      const creado = await skuService.create(dto);
      setSkus((prev) => [...prev, creado].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      return creado;
    } finally {
      setIsCreating(false);
    }
  }, []);

  return { skus, isLoading, error, refetch: fetchSkus, createSku, isCreating };
}
