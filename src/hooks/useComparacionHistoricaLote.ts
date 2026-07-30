import { useCallback, useEffect, useState } from "react";
import { extraerMensajeError, loteService } from "../services/lote.service";
import type { ComparacionHistoricaLote } from "../types/comparacionHistorica.types";

interface UseComparacionHistoricaLoteResult {
  comparacion: ComparacionHistoricaLote | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// HU-24: GET /lotes/:id/comparacion-historica. Solo se dispara cuando
// loteId no es null, mismo criterio que useHistorialRevisionesLote para no
// pegarle al endpoint mientras el modal está cerrado.
export function useComparacionHistoricaLote(
  loteId: number | null,
): UseComparacionHistoricaLoteResult {
  const [comparacion, setComparacion] = useState<ComparacionHistoricaLote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComparacion = useCallback(async () => {
    if (loteId === null) {
      setComparacion(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await loteService.getComparacionHistorica(loteId);
      setComparacion(result);
    } catch (err) {
      setError(extraerMensajeError(err, "No se pudo cargar la comparación histórica."));
    } finally {
      setIsLoading(false);
    }
  }, [loteId]);

  useEffect(() => {
    fetchComparacion();
  }, [fetchComparacion]);

  return { comparacion, isLoading, error, refetch: fetchComparacion };
}
