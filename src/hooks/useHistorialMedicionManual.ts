import { useCallback, useEffect, useState } from "react";
import { medicionManualService } from "../services/medicionManual.service";
import type { MedicionManualItem } from "../types/medicionManual.types";

const PAGE_SIZE = 20;

interface HistorialMedicionManualFilters {
  fechaInicio?: string;
  fechaFin?: string;
}

interface HistorialMeta {
  total: number;
  lastPage: number;
}

interface UseHistorialMedicionManualResult {
  items: MedicionManualItem[];
  meta: HistorialMeta;
  page: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useHistorialMedicionManual(
  loteId: number,
  filters: HistorialMedicionManualFilters,
): UseHistorialMedicionManualResult {
  const { fechaInicio, fechaFin } = filters;

  const [items, setItems] = useState<MedicionManualItem[]>([]);
  const [meta, setMeta] = useState<HistorialMeta>({ total: 0, lastPage: 1 });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Si cambian los filtros, volvemos a la página 1.
  useEffect(() => {
    setPage(1);
  }, [fechaInicio, fechaFin]);

  const fetchHistorial = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await medicionManualService.getHistorial(loteId, {
        fechaInicio,
        fechaFin,
        page,
        limit: PAGE_SIZE,
      });
      setItems(result.data);
      setMeta({
        total: result.total,
        lastPage: Math.max(1, Math.ceil(result.total / (result.limit || PAGE_SIZE))),
      });
    } catch {
      setError("No se pudo cargar el historial de mediciones manuales.");
    } finally {
      setIsLoading(false);
    }
  }, [loteId, fechaInicio, fechaFin, page]);

  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  return { items, meta, page, setPage, isLoading, error, refetch: fetchHistorial };
}
