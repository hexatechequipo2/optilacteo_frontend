import { AlertTriangle, CheckCircle2, MinusCircle, type LucideIcon } from "lucide-react";
import { EstadoSensor } from "../types/sensor.types";

const ESTADO_META: Record<EstadoSensor, { label: string; icon: LucideIcon; className: string }> = {
  [EstadoSensor.ACTIVO]: {
    label: "Activo",
    icon: CheckCircle2,
    className: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  },
  [EstadoSensor.INACTIVO]: {
    label: "Inactivo",
    icon: MinusCircle,
    className: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  },
  [EstadoSensor.FALLA]: {
    label: "Con falla",
    icon: AlertTriangle,
    className: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  },
};

interface SensorEstadoBadgeProps {
  estado: EstadoSensor;
}

export function SensorEstadoBadge({ estado }: SensorEstadoBadgeProps) {
  const { label, icon: Icon, className } = ESTADO_META[estado];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
