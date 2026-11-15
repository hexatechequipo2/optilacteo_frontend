import { useCallback, useEffect, useRef, useState } from "react";
import { loteService } from "../services/lote.service";
import { mensajeErrorApi } from "../utils/mensajeErrorApi";
import type {
  ConsultaLotesProduccionQuery,
  ConsultaLotesProduccionResponse,
} from "../types/consultaLotesProduccion.types";

interface UseConsultaLotesProduccionResult {
  resultado: ConsultaLotesProduccionResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const ERROR_CONSULTA = "No se pudieron cargar los lotes de producción. Intentá nuevamente.";

// HU-77: GET /lotes/producciones/consulta. Cada cambio de filtros dispara un
// pedido nuevo y cancela el anterior (mismo patrón que useDesviosProveedor,
// HU-74): una respuesta tardía de un filtro viejo nunca pisa la actual.
// `query` se compara por valor (JSON) para no depender de que el componente
// la memoice.
export function useConsultaLotesProduccion(
  query: ConsultaLotesProduccionQuery,
): UseConsultaLotesProduccionResult {
  const [resultado, setResultado] = useState<ConsultaLotesProduccionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const clave = JSON.stringify(query);

  const fetchConsulta = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsLoading(true);
    setError(null);
    try {
      const data = await loteService.consultarProducciones(
        JSON.parse(clave) as ConsultaLotesProduccionQuery,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setResultado(data);
    } catch (err) {
      if (controller.signal.aborted) return;
      // 400 (rango inválido) → mensaje del back; 5xx/red → ERROR_CONSULTA.
      setError(mensajeErrorApi(err, ERROR_CONSULTA));
      setResultado(null);
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [clave]);

  useEffect(() => {
    void fetchConsulta();
    return () => controllerRef.current?.abort();
  }, [fetchConsulta]);

  return { resultado, isLoading, error, refetch: fetchConsulta };
}
