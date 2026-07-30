import { useCallback, useEffect, useRef, useState } from "react";
import { dashboardProduccionService } from "../services/dashboardProduccion.service";
import type {
  DashboardHistoricoResponse,
  DashboardResumenResponse,
} from "../types/dashboardProduccion.types";

const INTERVALO_DEFAULT_MS = 30_000;

interface UseDashboardProduccionResult {
  resumen: DashboardResumenResponse | null;
  historico: DashboardHistoricoResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// AC2 (HU-38): actualización automática sin recarga manual, con intervalo
// configurable — se pasa por parámetro, con 30s por defecto. Misma base que
// useNotificaciones.ts (flag "cancelado" para evitar setState post-unmount),
// pero acá con polling en vez de WS porque el módulo de dashboard es un
// snapshot agregado, no un stream de eventos. GET /dashboard y
// GET /dashboard/lotes-procesados/historico son dos endpoints separados
// (ver dashboard.controller.ts) — se piden juntos con Promise.all.
export function useDashboardProduccion(
  intervaloMs: number = INTERVALO_DEFAULT_MS,
): UseDashboardProduccionResult {
  const [resumen, setResumen] = useState<DashboardResumenResponse | null>(null);
  const [historico, setHistorico] = useState<DashboardHistoricoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canceladoRef = useRef(false);

  const cargar = useCallback(async () => {
    try {
      const [resumenData, historicoData] = await Promise.all([
        dashboardProduccionService.getResumenHoy(),
        dashboardProduccionService.getHistoricoLotesProcesados(7),
      ]);
      if (!canceladoRef.current) {
        setResumen(resumenData);
        setHistorico(historicoData);
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

  return { resumen, historico, isLoading, error, refetch: cargar };
}
