import { useCallback, useEffect, useRef, useState } from "react";
import { dashboardProduccionService } from "../services/dashboardProduccion.service";
import type {
  DashboardHistoricoResponse,
  DashboardResumenResponse,
  FiltroPeriodoDashboard,
  GranularidadHistorico,
} from "../types/dashboardProduccion.types";

const INTERVALO_DEFAULT_MS = 30_000;

// Mapea el filtro del segmented control a los query params que espera
// GET /dashboard/lotes-procesados/historico?granularidad=...&cantidad=....
// "hoy" y "semana" piden serie diaria (1 y 7 puntos); "mes" pide el mes
// actual agregado. Default = "semana" para no cambiar el comportamiento
// previo (antes se pedía siempre dias=7).
const FILTRO_A_PARAMS: Record<
  FiltroPeriodoDashboard,
  { granularidad: GranularidadHistorico; cantidad: number }
> = {
  hoy: { granularidad: "dia", cantidad: 1 },
  semana: { granularidad: "dia", cantidad: 7 },
  mes: { granularidad: "mes", cantidad: 1 },
};

// GET /dashboard (métricas generales) no toma "cantidad", solo agrega según
// la granularidad pedida: hoy, esta semana o este mes.
const FILTRO_A_GRANULARIDAD_RESUMEN: Record<FiltroPeriodoDashboard, GranularidadHistorico> = {
  hoy: "dia",
  semana: "semana",
  mes: "mes",
};

interface UseDashboardProduccionResult {
  resumen: DashboardResumenResponse | null;
  historico: DashboardHistoricoResponse | null;
  isLoading: boolean;
  error: string | null;
  filtro: FiltroPeriodoDashboard;
  setFiltro: (filtro: FiltroPeriodoDashboard) => void;
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
  const [filtro, setFiltro] = useState<FiltroPeriodoDashboard>("semana");
  const canceladoRef = useRef(false);

  const cargar = useCallback(async () => {
    try {
      const { granularidad, cantidad } = FILTRO_A_PARAMS[filtro];
      const [resumenData, historicoData] = await Promise.all([
        dashboardProduccionService.getResumenHoy(FILTRO_A_GRANULARIDAD_RESUMEN[filtro]),
        dashboardProduccionService.getHistoricoLotesProcesados(granularidad, cantidad),
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
  }, [filtro]);

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

  return { resumen, historico, isLoading, error, filtro, setFiltro, refetch: cargar };
}
