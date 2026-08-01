import { useMemo } from "react";
import { useSensoresRealtime } from "../../../hooks/useSensoresRealtime";
import { SensorEstadoBadge } from "../../../components/SensorEstadoBadge";
import { IngresoManualFallback } from "../../Sensores/components/IngresoManualFallback";
import { PARAMETRO_LABEL } from "../../Sensores/constants/parametroSensor";
import type { Lote } from "../../../types/lote.types";

interface IngresoManualFallbackLoteTabProps {
  lote: Lote;
}

// HU-15: reusa el mismo campo de fallback por sensor que Sensores > Estado y
// diagnóstico (IngresoManualFallback), acá filtrado a los sensores de ESTE
// lote en vez de mostrar todos los de la empresa. useSensoresRealtime (WS)
// en vez de useSensores (REST) para que habilitar/deshabilitar según
// sensor.estado sea reactivo mientras el modal está abierto (criterios 2 y 6).
export function IngresoManualFallbackLoteTab({ lote }: IngresoManualFallbackLoteTabProps) {
  const { sensores, isLoading, error } = useSensoresRealtime();

  const sensoresDelLote = useMemo(
    () => sensores.filter((s) => s.loteActualId === lote.id),
    [sensores, lote.id],
  );

  if (isLoading) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Cargando sensores...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  if (sensoresDelLote.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Este lote no tiene sensores asociados.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {sensoresDelLote.map((sensor) => (
        <div
          key={sensor.id}
          className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {sensor.nombre} · {PARAMETRO_LABEL[sensor.parametro]}
            </p>
            <SensorEstadoBadge estado={sensor.estado} />
          </div>
          <IngresoManualFallback sensor={sensor} />
        </div>
      ))}
    </div>
  );
}
