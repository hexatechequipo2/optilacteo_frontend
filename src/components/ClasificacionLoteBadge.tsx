import { AlertTriangle, CheckCircle2, HelpCircle, type LucideIcon } from "lucide-react";
import { ResultadoClasificacion } from "../types/clasificacionLote.types";

const RESULTADO_META: Record<
  ResultadoClasificacion,
  { label: string; icon: LucideIcon; className: string }
> = {
  [ResultadoClasificacion.APTO]: {
    label: "Apto",
    icon: CheckCircle2,
    className: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  },
  [ResultadoClasificacion.NO_APTO]: {
    label: "No apto",
    icon: AlertTriangle,
    className: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  },
  [ResultadoClasificacion.EN_REVISION]: {
    label: "En revisión",
    icon: HelpCircle,
    className: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  },
};

interface ClasificacionLoteBadgeProps {
  resultado: ResultadoClasificacion;
}

export function ClasificacionLoteBadge({ resultado }: ClasificacionLoteBadgeProps) {
  const { label, icon: Icon, className } = RESULTADO_META[resultado];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
