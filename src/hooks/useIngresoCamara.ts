import { useCallback, useEffect, useState } from "react";
import { ingresoCamaraService } from "../services/ingresoCamara.service";
import type { CreateIngresoCamaraDto, IngresoCamara } from "../types/ingresoCamara.types";

interface UseIngresoCamaraResult {
  ingresos: IngresoCamara[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createIngreso: (dto: CreateIngresoCamaraDto) => Promise<IngresoCamara>;
  isCreating: boolean;
}

// skuId: filtro server-side (GET /ingresos-camara?skuId=...), igual criterio
// que LoteFilterQuery en useLotes. undefined = sin filtro (trae todos).
export function useIngresoCamara(skuId?: number): UseIngresoCamaraResult {
  const [ingresos, setIngresos] = useState<IngresoCamara[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchIngresos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await ingresoCamaraService.getAll({ skuId });
      setIngresos(result);
    } catch {
      setError("No se pudieron cargar los ingresos a cámara.");
    } finally {
      setIsLoading(false);
    }
  }, [skuId]);

  useEffect(() => {
    fetchIngresos();
  }, [fetchIngresos]);

  const createIngreso = useCallback(
    async (dto: CreateIngresoCamaraDto) => {
      setIsCreating(true);
      try {
        const creado = await ingresoCamaraService.create(dto);
        // El filtro activo puede excluir el ingreso recién creado (si es de
        // otro SKU); solo lo sumamos al estado local si coincide, mismo
        // criterio de "sin refetch completo" que useLotes.createLote.
        if (!skuId || creado.skuId === skuId) {
          setIngresos((prev) => [creado, ...prev]);
        }
        return creado;
      } finally {
        setIsCreating(false);
      }
    },
    [skuId],
  );

  return { ingresos, isLoading, error, refetch: fetchIngresos, createIngreso, isCreating };
}
