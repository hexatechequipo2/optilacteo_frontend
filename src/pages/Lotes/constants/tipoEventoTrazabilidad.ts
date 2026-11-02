import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  CheckCircle2,
  ClipboardCheck,
  GitBranch,
  HelpCircle,
  MapPin,
  PackagePlus,
  Snowflake,
} from "lucide-react";
import { TipoEventoTrazabilidad } from "../../../types/trazabilidad.types";

// Ícono + etiqueta por tipo de evento (HU-32), compartido por
// HistorialTrazabilidadModal y el detalle de HU-77 — mismo criterio que
// RESULTADO_META en ClasificacionLoteBadge (dict fijo + fallback defensivo si
// el backend llega a mandar un tipo fuera del enum vigente).
export const TIPO_EVENTO_META: Record<TipoEventoTrazabilidad, { label: string; icon: LucideIcon }> = {
  [TipoEventoTrazabilidad.RECEPCION]: { label: "Recepción", icon: PackagePlus },
  [TipoEventoTrazabilidad.CLASIFICACION]: {
    label: "Clasificación automática",
    icon: ClipboardCheck,
  },
  [TipoEventoTrazabilidad.REVISION_CALIDAD]: { label: "Revisión de calidad", icon: ClipboardCheck },
  [TipoEventoTrazabilidad.CAMBIO_UBICACION]: { label: "Cambio de ubicación", icon: MapPin },
  [TipoEventoTrazabilidad.INGRESO_CAMARA]: { label: "Ingreso a cámara", icon: Snowflake },
  [TipoEventoTrazabilidad.CONSUMO_PARCIAL]: {
    label: "Consumo hacia producción",
    icon: ArrowRightLeft,
  },
  [TipoEventoTrazabilidad.FINALIZACION]: { label: "Finalización", icon: CheckCircle2 },
  [TipoEventoTrazabilidad.RECOMENDACION_DESTINO]: {
    label: "Recomendación de destino",
    icon: GitBranch,
  },
};

export const TIPO_EVENTO_FALLBACK = { label: "Evento", icon: HelpCircle };

export function metaTipoEvento(tipo: string): { label: string; icon: LucideIcon } {
  return TIPO_EVENTO_META[tipo as TipoEventoTrazabilidad] ?? TIPO_EVENTO_FALLBACK;
}
