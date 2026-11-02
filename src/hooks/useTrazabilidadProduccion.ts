import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { loteService } from "../services/lote.service";
import { mensajeErrorApi } from "../utils/mensajeErrorApi";
import type { TrazabilidadProduccionResponse } from "../types/consultaLotesProduccion.types";

interface UseTrazabilidadProduccionResult {
  trazabilidad: TrazabilidadProduccionResponse | null;
  isLoading: boolean;
  error: string | null;
  // 404 (no existe o es de otra empresa) o id de la URL inválido: no es un
  // error a reintentar, la pantalla muestra "No se encontró el lote".
  noEncontrado: boolean;
  refetch: () => Promise<void>;
}

const ERROR_TRAZABILIDAD = "No se pudo cargar la trazabilidad del lote. Intentá nuevamente.";

// HU-77: GET /lotes/producciones/:id/trazabilidad. Mismo patrón que
// useConsultaLotesProduccion: cada pedido cancela el anterior, así una
// respuesta tardía de otro id nunca pisa la actual. `id` null = el
// parámetro de la ruta no es un entero positivo; no se llama al back.
export function useTrazabilidadProduccion(id: number | null): UseTrazabilidadProduccionResult {
  const [trazabilidad, setTrazabilidad] = useState<TrazabilidadProduccionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(id !== null);
  const [error, setError] = useState<string | null>(null);
  const [noEncontrado, setNoEncontrado] = useState(id === null);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchTrazabilidad = useCallback(async () => {
    controllerRef.current?.abort();
    setTrazabilidad(null);
    setError(null);
    if (id === null) {
      setNoEncontrado(true);
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    setNoEncontrado(false);
    setIsLoading(true);
    try {
      const data = await loteService.getTrazabilidadProduccion(id, controller.signal);
      if (controller.signal.aborted) return;
      setTrazabilidad(data);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setNoEncontrado(true);
      } else {
        setError(mensajeErrorApi(err, ERROR_TRAZABILIDAD));
      }
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchTrazabilidad();
    return () => controllerRef.current?.abort();
  }, [fetchTrazabilidad]);

  return { trazabilidad, isLoading, error, noEncontrado, refetch: fetchTrazabilidad };
}
