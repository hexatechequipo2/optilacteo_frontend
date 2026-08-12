import { AlertOctagon, AlertTriangle, CircleCheck, Info, type LucideIcon } from "lucide-react";
import { NivelAlerta } from "../../../types/notificacion.types";
import { EstadoAlerta } from "../../../types/alertaCierre.types";
// Reutilizamos los labels/unidades ya definidos para Sensores en vez de
// duplicarlos: son el mismo Parametro (configParametro.types.ts) en las dos
// pantallas.
export { PARAMETRO_LABEL, UNIDAD_POR_PARAMETRO } from "../../Sensores/constants/parametroSensor";

type BadgeVariant = "success" | "warning" | "neutral" | "danger";

interface NivelAlertaMeta {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  // Clases propias (no las de Badge) para los contadores destacados y el
  // borde izquierdo de cada card, donde necesitamos más peso visual que un
  // badge chico.
  className: string;
  // Solo el color de texto/ícono, para reusar en contextos donde className
  // completo (con fondo y borde) no aplica, como el listado de "Reglas
  // activas".
  iconClassName: string;
}

export const NIVEL_ALERTA_META: Record<NivelAlerta, NivelAlertaMeta> = {
  [NivelAlerta.CRITICA]: {
    label: "Crítica",
    icon: AlertOctagon,
    badgeVariant: "danger",
    className: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400",
    iconClassName: "text-red-600 dark:text-red-400",
  },
  [NivelAlerta.ADVERTENCIA]: {
    label: "Advertencia",
    icon: AlertTriangle,
    badgeVariant: "warning",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
    iconClassName: "text-amber-600 dark:text-amber-400",
  },
  [NivelAlerta.INFORMATIVA]: {
    label: "Informativa",
    icon: Info,
    badgeVariant: "neutral",
    className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400",
    iconClassName: "text-blue-600 dark:text-blue-400",
  },
};

// HU-27: estado de cierre (mockeado, ver alertaCierre.service.ts). Mismo
// shape reducido que NIVEL_ALERTA_META, sin className/iconClassName porque
// esto solo se usa en un Badge chico (AlertaCard, AlertaDetallePanel).
export const ESTADO_ALERTA_META: Record<EstadoAlerta, { label: string; icon: LucideIcon; badgeVariant: "warning" | "success" }> = {
  [EstadoAlerta.ABIERTA]: { label: "Abierta", icon: AlertTriangle, badgeVariant: "warning" },
  [EstadoAlerta.CERRADA]: { label: "Cerrada", icon: CircleCheck, badgeVariant: "success" },
};

// Tabs del header (Figura 1, Sprint 3): "Todas / Críticas / Preventivas /
// Info". "Preventivas" es el nombre que usa el prototipo para el nivel
// advertencia.
export type TabAlertas = "todas" | "criticas" | "preventivas" | "info";

export const TABS_ALERTAS: { value: TabAlertas; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "criticas", label: "Críticas" },
  { value: "preventivas", label: "Preventivas" },
  { value: "info", label: "Info" },
];

export const TAB_A_NIVEL: Record<TabAlertas, NivelAlerta | null> = {
  todas: null,
  criticas: NivelAlerta.CRITICA,
  preventivas: NivelAlerta.ADVERTENCIA,
  info: NivelAlerta.INFORMATIVA,
};
