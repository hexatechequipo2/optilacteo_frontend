import { Activity, Droplet, Gauge, Grid2x2, Radar, Target, Thermometer, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSensoresRealtime } from "../../../hooks/useSensoresRealtime";
import { SensorEstadoBadge } from "../../../components/SensorEstadoBadge";
import { Parametro } from "../../../types/configParametro.types";
import { EstadoSensor } from "../../../types/sensor.types";
import { PARAMETRO_LABEL, UNIDAD_POR_PARAMETRO } from "../constants/parametroSensor";

const PARAMETRO_ICON: Record<Parametro, LucideIcon> = {
  [Parametro.PH]: Target,
  [Parametro.TEMPERATURA]: Thermometer,
  [Parametro.DENSIDAD]: Grid2x2,
  [Parametro.GRASA]: Droplet,
  [Parametro.PROTEINA]: Gauge,
  [Parametro.ACIDEZ]: Activity,
  [Parametro.CONDUCTIVIDAD]: Radar,
};

const CARD_CLASS: Record<EstadoSensor, string> = {
  [EstadoSensor.ACTIVO]: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
  [EstadoSensor.INACTIVO]: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
  [EstadoSensor.FALLA]: "border-red-200 bg-red-50/60 dark:border-red-500/30 dark:bg-red-500/5",
};

function formatearHace(timestamp: string | null | undefined, ahora: number): string {
  if (!timestamp) return "—";
  const diffSeg = Math.floor((ahora - new Date(timestamp).getTime()) / 1000);
  if (diffSeg < 1) return "ahora";
  if (diffSeg < 60) return `hace ${diffSeg} s`;
  if (diffSeg < 3600) return `hace ${Math.floor(diffSeg / 60)} min`;
  return `hace ${Math.floor(diffSeg / 3600)} h`;
}

export function EstadoDiagnosticoTab() {
  const { sensores, lecturas, isLoading, error, isRealtimeConnected } = useSensoresRealtime();

  // Un solo intervalo para todo el grid: recalcula los "hace X s" en vivo
  // sin depender de ninguna librería de fechas (el proyecto no tiene una).
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { activos, conFalla, inactivos, conectados } = useMemo(() => {
    const activos = sensores.filter((s) => s.estado === EstadoSensor.ACTIVO).length;
    const conFalla = sensores.filter((s) => s.estado === EstadoSensor.FALLA).length;
    const inactivos = sensores.filter((s) => s.estado === EstadoSensor.INACTIVO).length;
    return { activos, conFalla, inactivos, conectados: activos + conFalla };
  }, [sensores]);

  if (isLoading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Cargando sensores...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-blue-50/60 to-transparent p-5 dark:border-slate-800 dark:from-blue-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Radar className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-slate-900 dark:text-white">
                Sensores IoT
              </span>
              {isRealtimeConnected ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> EN VIVO
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Reconectando...
                </span>
              )}
            </div>
          </div>
          <span className="font-mono text-sm text-slate-500 dark:text-slate-400">
            {conectados} de {sensores.length} conectados
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-500/15 dark:text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> {activos} activos
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-500/15 dark:text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> {conFalla} con falla
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {inactivos} inactivos
          </span>
        </div>
      </div>

      {sensores.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No hay sensores registrados.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sensores.map((sensor) => {
            const Icon = PARAMETRO_ICON[sensor.parametro];
            const lectura = lecturas[sensor.id];
            const unidad = UNIDAD_POR_PARAMETRO[sensor.parametro];
            const loteId = sensor.loteActualId ?? lectura?.loteId ?? null;

            return (
              <div key={sensor.id} className={`rounded-xl border p-4 ${CARD_CLASS[sensor.estado]}`}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <SensorEstadoBadge estado={sensor.estado} />
                </div>

                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {sensor.nombre}
                </p>

                <p className="my-2 text-2xl font-bold text-slate-900 dark:text-white">
                  {lectura ? lectura.valorActual : "—"}
                  {lectura && unidad && (
                    <span className="ml-1 text-sm font-medium text-slate-400 dark:text-slate-500">
                      {unidad}
                    </span>
                  )}
                </p>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {PARAMETRO_LABEL[sensor.parametro]} · {loteId != null ? `Lote #${loteId}` : "Sin lote asociado"} ·{" "}
                  {formatearHace(lectura?.timestampLectura ?? sensor.ultimaLectura, ahora)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
