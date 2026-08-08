import { useCallback, useEffect, useState } from "react";
import { loteService } from "../services/lote.service";
import type { Lote } from "../types/lote.types";

interface UseLotesNoAptosResult {
  lotes: Lote[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// HU-22: bandeja de lotes No Apto pendientes de revisión manual (GET
// /lotes/no-aptos). Mismo patrón que useLotes, pero sin mutaciones locales:
// tras aprobar/rechazar el lote deja de calificar para este endpoint, así
// que la única forma correcta de reflejarlo es un refetch completo.
export function useLotesNoAptos(): UseLotesNoAptosResult {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await loteService.getNoAptos();
      setLotes(result);
    } catch {
      setError("No se pudieron cargar los lotes No Apto.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLotes();
  }, [fetchLotes]);

  return { lotes, isLoading, error, refetch: fetchLotes };
}
