import { AlertTriangle, CheckCircle2, HelpCircle, type LucideIcon } from "lucide-react";
import { ClasificacionLote } from "../types/lote.types";

const RESULTADO_META: Record<
  ClasificacionLote,
  { label: string; icon: LucideIcon; className: string }
> = {
  [ClasificacionLote.APTO]: {
    label: "Apto",
    icon: CheckCircle2,
    className: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  },
  [ClasificacionLote.NO_APTO]: {
    label: "No apto",
    icon: AlertTriangle,
    className: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  },
};

// Fallback defensivo: si el backend llega a mandar un valor fuera del enum
// vigente (ej. datos viejos de antes de una migración de columna todavía sin
// aplicar), no se rompe el render — se ve como "desconocido" en vez de
// tirar el componente entero por un `undefined` sin desestructurar.
const FALLBACK_META = {
  label: "Sin clasificar",
  icon: HelpCircle,
  className: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

interface ClasificacionLoteBadgeProps {
  resultado: ClasificacionLote;
}

export function ClasificacionLoteBadge({ resultado }: ClasificacionLoteBadgeProps) {
  const { label, icon: Icon, className } = RESULTADO_META[resultado] ?? FALLBACK_META;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
