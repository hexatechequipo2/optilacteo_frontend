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
  exportCsv: () => Promise<void>;
  exportPdf: () => Promise<void>;
}

// HU-28: mismo esqueleto que useHistorialMediciones.ts (HU-19) — carga
// paginada vía el service (GET /notificaciones/historial, ver
// historialAlertas.service.ts) y export como side effect aparte, sin
// re-consultar la página actual.
export function useHistorialAlertas(filters: Filters): UseHistorialAlertasResult {
  const { loteId, nivelAlerta, estado, fechaInicio, fechaFin } = filters;

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
  }, [loteId, nivelAlerta, estado, fechaInicio, fechaFin]);

  const fetchHistorial = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await historialAlertasService.getHistorial({
        loteId,
        nivelAlerta,
        estado,
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
  }, [loteId, nivelAlerta, estado, fechaInicio, fechaFin, page]);

  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  const exportCsv = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      await historialAlertasService.exportCsv({ loteId, nivelAlerta, estado, fechaInicio, fechaFin });
    } catch {
      setExportError("No se pudo exportar el historial a CSV.");
    } finally {
      setIsExporting(false);
    }
  }, [loteId, nivelAlerta, estado, fechaInicio, fechaFin]);

  const exportPdf = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      await historialAlertasService.exportPdf({ loteId, nivelAlerta, estado, fechaInicio, fechaFin });
    } catch {
      setExportError("No se pudo exportar el historial a PDF.");
    } finally {
      setIsExporting(false);
    }
  }, [loteId, nivelAlerta, estado, fechaInicio, fechaFin]);

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
    exportPdf,
  };
}
