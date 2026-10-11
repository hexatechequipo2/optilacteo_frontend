import { useCallback, useEffect, useRef, useState } from "react";
import { auditLogService } from "../services/auditLog.service";
import type { AuditLog, AuditLogFilterQuery } from "../types/auditLog.types";

const PAGE_SIZE = 20;

type Filters = Omit<AuditLogFilterQuery, "page" | "limit">;

interface AuditLogMeta {
  total: number;
  lastPage: number;
}

interface UseAuditLogResult {
  items: AuditLog[];
  meta: AuditLogMeta;
  page: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isExporting: boolean;
  exportError: string | null;
  exportCsv: () => Promise<void>;
}

// HU-43: mismo esqueleto que useHistorialAlertas.ts — carga paginada
// server-side (GET /audit-log) y export como side effect aparte.
export function useAuditLog(filters: Filters): UseAuditLogResult {
  const { userId, tipo, estado, fechaDesde, fechaHasta } = filters;
  const filtersKey = JSON.stringify({ userId, tipo, estado, fechaDesde, fechaHasta });

  const [items, setItems] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<AuditLogMeta>({ total: 0, lastPage: 1 });
  const [page, setPage] = useState(1);
  const [pageFiltersKey, setPageFiltersKey] = useState(filtersKey);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  // Si cambian los filtros, volvemos a la página 1 durante el render (patrón
  // "ajustar estado cuando cambia una prop"): React re-renderiza antes de
  // commitear, así que el effect de fetch corre una sola vez, ya con page=1.
  // Con un useEffect aparte había un fetch con la página vieja y otro con 1.
  if (pageFiltersKey !== filtersKey) {
    setPageFiltersKey(filtersKey);
    setPage(1);
  }

  const fetchAuditLog = useCallback(async () => {
    // Solo la respuesta del último request se aplica: una más lenta de
    // filtros/página anteriores no pisa a la nueva.
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await auditLogService.getAll({
        userId,
        tipo,
        estado,
        fechaDesde,
        fechaHasta,
        page,
        limit: PAGE_SIZE,
      });
      if (requestId !== requestIdRef.current) return;
      setItems(result.data);
      setMeta({
        total: result.total,
        lastPage: Math.max(1, Math.ceil(result.total / PAGE_SIZE)),
      });
    } catch {
      if (requestId !== requestIdRef.current) return;
      setError("No se pudo cargar el log de auditoría.");
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, [userId, tipo, estado, fechaDesde, fechaHasta, page]);

  useEffect(() => {
    fetchAuditLog();
  }, [fetchAuditLog]);

  const exportCsv = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      await auditLogService.exportCsv({ userId, tipo, estado, fechaDesde, fechaHasta });
    } catch {
      setExportError("No se pudo exportar el log de auditoría a CSV.");
    } finally {
      setIsExporting(false);
    }
  }, [userId, tipo, estado, fechaDesde, fechaHasta]);

  return {
    items,
    meta,
    page,
    setPage,
    isLoading,
    error,
    refetch: fetchAuditLog,
    isExporting,
    exportError,
    exportCsv,
  };
}
