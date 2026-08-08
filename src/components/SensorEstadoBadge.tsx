import { AlertTriangle, CheckCircle2, HelpCircle, MinusCircle, type LucideIcon } from "lucide-react";
import { EstadoSensor } from "../types/sensor.types";

type EstadoMeta = { label: string; icon: LucideIcon; className: string };

const ESTADO_META: Record<EstadoSensor, EstadoMeta> = {
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

// Defensivo: un `estado` que no matchea ninguna clave (dato corrupto o
// desincronizado del backend, ver caso remove() sin return en HU-65) no
// debe tirar abajo el render de todo el listado — se degrada a un badge
// neutro en vez de crashear.
const ESTADO_DESCONOCIDO: EstadoMeta = {
  label: "Desconocido",
  icon: HelpCircle,
  className: "bg-slate-100 text-slate-500 dark:bg-slate-500/10 dark:text-slate-500",
};

interface SensorEstadoBadgeProps {
  estado: EstadoSensor;
}

export function SensorEstadoBadge({ estado }: SensorEstadoBadgeProps) {
  const { label, icon: Icon, className } = ESTADO_META[estado] ?? ESTADO_DESCONOCIDO;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
