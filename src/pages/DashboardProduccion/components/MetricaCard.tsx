import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { MetricaTendencia } from "../../../types/dashboardProduccion.types";

interface MetricaCardProps {
  label: string;
  metrica: MetricaTendencia;
}

// AC3 (HU-38): cada métrica muestra una indicación visual de tendencia
// (sube/baja/igual) respecto al día anterior. Mismo estilo de tarjeta que
// StatCard (Dashboard admin) para mantener consistencia visual entre los
// dos dashboards del sistema.
export function MetricaCard({ label, metrica }: MetricaCardProps) {
  const { valor, variacion, tendencia } = metrica;

  const colorTendencia =
    tendencia === "baja"
      ? "text-red-600 dark:text-red-400"
      : tendencia === "sube"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-slate-400 dark:text-slate-500";

  const Icono = tendencia === "baja" ? TrendingDown : tendencia === "sube" ? TrendingUp : Minus;

  const signo = variacion > 0 ? "+" : "";

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900">
      <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className="mt-2 truncate text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
        {valor}
      </p>
      <p className={`mt-1 flex items-center gap-1 text-xs font-medium ${colorTendencia}`}>
        <Icono className="h-3.5 w-3.5 shrink-0" />
        {signo}
        {variacion} vs. ayer
      </p>
    </div>
  );
}
