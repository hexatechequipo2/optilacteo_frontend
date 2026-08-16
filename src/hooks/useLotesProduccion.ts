import { useCallback, useEffect, useState } from "react";
import { loteConsumoService } from "../services/loteConsumo.service";
import type { LoteProduccion } from "../types/loteConsumo.types";

interface UseLotesProduccionResult {
  lotesProduccion: LoteProduccion[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// HU-68: GET /lotes/producciones. Alimenta el selector "lote de producción
// destino" del formulario de registro de consumo; se carga una sola vez
// (universo suficiente, no está paginado en el backend).
export function useLotesProduccion(): UseLotesProduccionResult {
  const [lotesProduccion, setLotesProduccion] = useState<LoteProduccion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLotesProduccion = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await loteConsumoService.getLotesProduccion();
      setLotesProduccion(result);
    } catch {
      setError("No se pudieron cargar los lotes de producción.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLotesProduccion();
  }, [fetchLotesProduccion]);

  return { lotesProduccion, isLoading, error, refetch: fetchLotesProduccion };
}
