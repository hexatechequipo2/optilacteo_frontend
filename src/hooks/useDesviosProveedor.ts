import { useCallback, useEffect, useState } from "react";
import { extraerMensajeError, loteService } from "../services/lote.service";
import type { DesvioProveedorLote } from "../types/desvioProveedor.types";

interface UseDesviosProveedorResult {
  desvios: DesvioProveedorLote[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// HU-66: GET /lotes/proveedor/:proveedorId/desvios. Solo se dispara cuando
// proveedorId no es null, mismo criterio que useComparacionHistoricaLote
// para no pegarle al endpoint mientras el modal está cerrado.
export function useDesviosProveedor(proveedorId: number | null): UseDesviosProveedorResult {
  const [desvios, setDesvios] = useState<DesvioProveedorLote[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDesvios = useCallback(async () => {
    if (proveedorId === null) {
      setDesvios(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await loteService.getDesviosPorProveedor(proveedorId);
      setDesvios(result);
    } catch (err) {
      setError(extraerMensajeError(err, "No se pudo cargar el historial de desvíos."));
    } finally {
      setIsLoading(false);
    }
  }, [proveedorId]);

  useEffect(() => {
    fetchDesvios();
  }, [fetchDesvios]);

  return { desvios, isLoading, error, refetch: fetchDesvios };
}
