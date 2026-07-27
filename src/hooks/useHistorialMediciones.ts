import { useCallback, useEffect, useState } from "react";
import { historialMedicionesService } from "../services/historialMediciones.service";
import type { HistorialMedicionItem } from "../types/historialMediciones.types";

const PAGE_SIZE = 20;

interface HistorialMedicionesFilters {
  fechaInicio?: string;
  fechaFin?: string;
  loteCodigo?: string;
}

interface HistorialMeta {
  total: number;
  lastPage: number;
  rangoAmplio: boolean;
}

interface UseHistorialMedicionesResult {
  items: HistorialMedicionItem[];
  meta: HistorialMeta;
  page: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isExporting: boolean;
  exportError: string | null;
  exportCsv: () => Promise<void>;
}

export function useHistorialMediciones(
  filters: HistorialMedicionesFilters,
): UseHistorialMedicionesResult {
  const { fechaInicio, fechaFin, loteCodigo } = filters;

  const [items, setItems] = useState<HistorialMedicionItem[]>([]);
  const [meta, setMeta] = useState<HistorialMeta>({ total: 0, lastPage: 1, rangoAmplio: false });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Si cambian los filtros, volvemos a la página 1
  useEffect(() => {
    setPage(1);
  }, [fechaInicio, fechaFin, loteCodigo]);

  const fetchHistorial = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await historialMedicionesService.getHistorial({
        fechaInicio,
        fechaFin,
        loteCodigo,
        page,
        limit: PAGE_SIZE,
      });
      setItems(result.data);
      setMeta({
        total: result.total,
        lastPage: Math.max(1, Math.ceil(result.total / (result.limit || PAGE_SIZE))),
        rangoAmplio: result.rangoAmplio,
      });
    } catch {
      setError("No se pudo cargar el historial de mediciones.");
    } finally {
      setIsLoading(false);
    }
  }, [fechaInicio, fechaFin, loteCodigo, page]);

  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  const exportCsv = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      await historialMedicionesService.exportCsv({ fechaInicio, fechaFin, loteCodigo });
    } catch {
      setExportError("No se pudo descargar el CSV.");
    } finally {
      setIsExporting(false);
    }
  }, [fechaInicio, fechaFin, loteCodigo]);

  return {
    items,
    meta,
    page,
    setPage,
    isLoading,
    error,
    refetch: fetchHistorial,
    isExporting,
    exportError,
    exportCsv,
  };
}
