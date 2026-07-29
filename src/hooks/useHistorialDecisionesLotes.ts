import { useCallback, useEffect, useState } from "react";
import { loteService } from "../services/lote.service";
import type { Lote, LoteRevision } from "../types/lote.types";

export interface DecisionLoteItem {
  revision: LoteRevision;
  lote: Lote;
}

interface UseHistorialDecisionesLotesResult {
  items: DecisionLoteItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// HU-22 (AC "registro de lotes aprobados/rechazados con justificación, fecha
// y usuario"): no existe un endpoint global de revisiones en el backend, solo
// GET /lotes/:id/revisiones por lote (ver lote.controller.ts). Se arma acá
// pegándole a ese endpoint por cada lote (N+1, aceptable para el volumen
// actual de lotes por empresa). TODO(backend): si el volumen crece, pedir un
// GET /lotes/revisiones (o similar) que devuelva todas las revisiones de la
// empresa en una sola llamada.
export function useHistorialDecisionesLotes(): UseHistorialDecisionesLotesResult {
  const [items, setItems] = useState<DecisionLoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistorial = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const lotes = await loteService.getAll();
      const porLote = await Promise.all(
        lotes.map(async (lote) => {
          const revisiones = await loteService.getHistorialRevisiones(lote.id).catch(() => []);
          return revisiones.map((revision) => ({ revision, lote }));
        }),
      );
      const flat = porLote
        .flat()
        .sort(
          (a, b) => new Date(b.revision.createdAt).getTime() - new Date(a.revision.createdAt).getTime(),
        );
      setItems(flat);
    } catch {
      setError("No se pudo cargar el historial de decisiones.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  return { items, isLoading, error, refetch: fetchHistorial };
}
