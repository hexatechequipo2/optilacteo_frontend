import { useCallback, useEffect, useState } from "react";
import { historialAlertasService } from "../services/historialAlertas.service";
import type {
  HistorialAlertaItem,
  HistorialAlertasFilterQuery,
} from "../types/historialAlertas.types";

const PAGE_SIZE = 20;

// Mismos filtros que HistorialAlertasFilterQuery menos la paginación: la
// arma la página, esto es lo que el usuario controla desde los <select>/
// <input> de fecha.
type Filters = Omit<HistorialAlertasFilterQuery, "page" | "limit">;

interface HistorialMeta {
  total: number;
  lastPage: number;
}

interface UseHistorialAlertasResult {
  items: HistorialAlertaItem[];
  meta: HistorialMeta;
  page: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isExporting: boolean;
  exportError: string | null;
  exportExcel: () => Promise<void>;
  exportPdf: () => Promise<void>;
}

// HU-28: mismo esqueleto que useHistorialMediciones.ts (HU-19) — carga
// paginada vía el service (que hoy filtra un mock en memoria, mañana un GET
// real, ver TODO(backend) en historialAlertas.service.ts) y export como
// side effect aparte, sin re-consultar la página actual.
export function useHistorialAlertas(filters: Filters): UseHistorialAlertasResult {
  const { loteId, nivel, fechaInicio, fechaFin } = filters;

  const [items, setItems] = useState<HistorialAlertaItem[]>([]);
  const [meta, setMeta] = useState<HistorialMeta>({ total: 0, lastPage: 1 });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Si cambian los filtros, volvemos a la página 1 (mismo criterio que
  // useHistorialMediciones).
  useEffect(() => {
    setPage(1);
  }, [loteId, nivel, fechaInicio, fechaFin]);

  const fetchHistorial = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await historialAlertasService.getHistorial({
        loteId,
        nivel,
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
      setError("No se pudo cargar el historial de alertas.");
    } finally {
      setIsLoading(false);
    }
  }, [loteId, nivel, fechaInicio, fechaFin, page]);

  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  const exportExcel = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      await historialAlertasService.exportExcel({ loteId, nivel, fechaInicio, fechaFin });
    } catch {
      setExportError("No se pudo exportar el historial a Excel.");
    } finally {
      setIsExporting(false);
    }
  }, [loteId, nivel, fechaInicio, fechaFin]);

  const exportPdf = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      await historialAlertasService.exportPdf({ loteId, nivel, fechaInicio, fechaFin });
    } catch {
      setExportError("No se pudo exportar el historial a PDF.");
    } finally {
      setIsExporting(false);
    }
  }, [loteId, nivel, fechaInicio, fechaFin]);

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
    exportExcel,
    exportPdf,
  };
}
