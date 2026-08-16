import { useCallback, useEffect, useState } from "react";
import { loteConsumoService } from "../services/loteConsumo.service";
import type { LoteConsumo } from "../types/loteConsumo.types";

interface UseConsumosLoteResult {
  consumos: LoteConsumo[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// HU-68 (AC2 y AC4): GET /lotes/:id/consumos. Solo se dispara cuando loteId
// no es null, mismo patrón que useHistorialRevisionesLote (no pegarle al
// endpoint mientras el panel está cerrado).
export function useConsumosLote(loteId: number | null): UseConsumosLoteResult {
  const [consumos, setConsumos] = useState<LoteConsumo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConsumos = useCallback(async () => {
    if (loteId === null) {
      setConsumos([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await loteConsumoService.getHistorial(loteId);
      setConsumos(result);
    } catch {
      setError("No se pudo cargar el historial de consumos parciales.");
    } finally {
      setIsLoading(false);
    }
  }, [loteId]);

  useEffect(() => {
    fetchConsumos();
  }, [fetchConsumos]);

  return { consumos, isLoading, error, refetch: fetchConsumos };
}
