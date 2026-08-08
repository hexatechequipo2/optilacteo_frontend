import { useCallback, useEffect, useState } from "react";
import { loteService } from "../services/lote.service";
import type { LoteRevision } from "../types/lote.types";

interface UseHistorialRevisionesLoteResult {
  revisiones: LoteRevision[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// HU-22 (AC "mostrar historial de decisiones previas"): GET
// /lotes/:id/revisiones. Solo se dispara cuando loteId no es null, para no
// pegarle al endpoint mientras el modal está cerrado.
export function useHistorialRevisionesLote(loteId: number | null): UseHistorialRevisionesLoteResult {
  const [revisiones, setRevisiones] = useState<LoteRevision[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistorial = useCallback(async () => {
    if (loteId === null) {
      setRevisiones([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await loteService.getHistorialRevisiones(loteId);
      setRevisiones(result);
    } catch {
      setError("No se pudo cargar el historial de revisiones.");
    } finally {
      setIsLoading(false);
    }
  }, [loteId]);

  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  return { revisiones, isLoading, error, refetch: fetchHistorial };
}
