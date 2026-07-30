import { useCallback, useEffect, useRef, useState } from "react";
import { dashboardProduccionService } from "../services/dashboardProduccion.service";
import type { DashboardProduccionResponse } from "../types/dashboardProduccion.types";

const INTERVALO_DEFAULT_MS = 30_000;

interface UseDashboardProduccionResult {
  data: DashboardProduccionResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// AC2 (HU-38): actualización automática sin recarga manual, con intervalo
// configurable — se pasa por parámetro, con 30s por defecto. Misma base que
// useNotificaciones.ts (flag "cancelado" para evitar setState post-unmount),
// pero acá con polling en vez de WS porque el módulo de dashboard es un
// snapshot agregado, no un stream de eventos.
export function useDashboardProduccion(
  intervaloMs: number = INTERVALO_DEFAULT_MS,
): UseDashboardProduccionResult {
  const [data, setData] = useState<DashboardProduccionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canceladoRef = useRef(false);

  const cargar = useCallback(async () => {
    try {
      const result = await dashboardProduccionService.getResumenHoy();
      if (!canceladoRef.current) {
        setData(result);
        setError(null);
      }
    } catch {
      if (!canceladoRef.current) {
        setError("No se pudo cargar el panel de producción.");
      }
    } finally {
      if (!canceladoRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    canceladoRef.current = false;
    setIsLoading(true);
    void cargar();

    const intervalId = setInterval(() => void cargar(), intervaloMs);

    return () => {
      canceladoRef.current = true;
      clearInterval(intervalId);
    };
  }, [cargar, intervaloMs]);

  return { data, isLoading, error, refetch: cargar };
}
