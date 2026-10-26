import { useCallback, useEffect, useRef, useState } from "react";
import { loteService } from "../services/lote.service";
import { mensajeErrorApi } from "../utils/mensajeErrorApi";
import type { DesvioProveedorLote } from "../types/desvioProveedor.types";

interface UseDesviosProveedorResult {
  desvios: DesvioProveedorLote[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface EstadoDesvios {
  proveedorId: number | null;
  desvios: DesvioProveedorLote[] | null;
  isLoading: boolean;
  error: string | null;
}

const ESTADO_VACIO: EstadoDesvios = {
  proveedorId: null,
  desvios: null,
  isLoading: false,
  error: null,
};

const ERROR_RECUPERACION = "No se pudo recuperar el historial de desvíos. Intentá nuevamente.";

// HU-66: GET /lotes/proveedor/:proveedorId/desvios. Solo se dispara cuando
// proveedorId no es null, mismo criterio que useComparacionHistoricaLote
// para no pegarle al endpoint mientras el modal está cerrado.
// HU-74: cada pedido lleva su AbortController. Cambiar de proveedor, cerrar el
// modal o reintentar cancela el anterior y su respuesta tardía se descarta. El
// estado recuerda a qué proveedor corresponde: si no coincide con el actual
// (render previo a que corra el efecto) se expone como cargando, sin datos ni
// error de otro proveedor.
export function useDesviosProveedor(proveedorId: number | null): UseDesviosProveedorResult {
  const [estado, setEstado] = useState<EstadoDesvios>(ESTADO_VACIO);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchDesvios = useCallback(async () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    if (proveedorId === null) {
      setEstado(ESTADO_VACIO);
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    setEstado({ proveedorId, desvios: null, isLoading: true, error: null });
    try {
      const result = await loteService.getDesviosPorProveedor(proveedorId, controller.signal);
      if (controller.signal.aborted) return;
      setEstado({ proveedorId, desvios: result, isLoading: false, error: null });
    } catch (err) {
      if (controller.signal.aborted) return;
      setEstado({
        proveedorId,
        desvios: null,
        isLoading: false,
        // HU-74: 5xx/red → ERROR_RECUPERACION; 4xx (404 de otra empresa) → mensaje del back.
        error: mensajeErrorApi(err, ERROR_RECUPERACION),
      });
    }
  }, [proveedorId]);

  useEffect(() => {
    void fetchDesvios();
    return () => controllerRef.current?.abort();
  }, [fetchDesvios]);

  if (estado.proveedorId !== proveedorId) {
    return { desvios: null, isLoading: proveedorId !== null, error: null, refetch: fetchDesvios };
  }
  return {
    desvios: estado.desvios,
    isLoading: estado.isLoading,
    error: estado.error,
    refetch: fetchDesvios,
  };
}
