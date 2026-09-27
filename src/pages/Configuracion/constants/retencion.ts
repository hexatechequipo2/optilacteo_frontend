import { ClipboardList, FlaskConical, Package, ScrollText, type LucideIcon } from "lucide-react";
import type { BadgeVariant } from "../../../components/ui/Badge";
import {
  AccionVencimiento,
  EntidadRetenible,
  EstadoRegistroRetencion,
} from "../../../types/retencion.types";

// HU-48: labels e íconos del tab "Retención de datos". La regla (piso de 24
// meses, baja lógica) vive en utils/retencion.ts, no acá.

export const ENTIDAD_RETENIBLE_META: Record<
  EntidadRetenible,
  { label: string; descripcion: string; icon: LucideIcon }
> = {
  [EntidadRetenible.LOTE]: {
    label: "Lotes",
    descripcion: "Recepción, origen y clasificación",
    icon: Package,
  },
  [EntidadRetenible.MEDICION]: {
    label: "Mediciones",
    descripcion: "Lecturas de sensores y registros manuales",
    icon: FlaskConical,
  },
  [EntidadRetenible.CONSUMO_LOTE]: {
    label: "Consumos de lote",
    descripcion: "Uso de materia prima en producción",
    icon: ClipboardList,
  },
  [EntidadRetenible.REGISTRO_AUDITORIA]: {
    label: "Registros de auditoría",
    descripcion: "Log de acciones de usuarios",
    icon: ScrollText,
  },
};

export const ACCION_VENCIMIENTO_META: Record<
  AccionVencimiento,
  { label: string; descripcion: string; labelBoton: string }
> = {
  [AccionVencimiento.ARCHIVAR]: {
    label: "Archivar (solo lectura)",
    descripcion: "El registro sigue consultable pero ya no puede editarse.",
    labelBoton: "Archivar",
  },
  [AccionVencimiento.CONSERVAR_ACTIVO]: {
    label: "Conservar activo",
    descripcion: "El registro sigue activo y editable aunque se haya cumplido el período.",
    labelBoton: "Conservar activo",
  },
  [AccionVencimiento.REVISION_MANUAL]: {
    label: "Marcar para revisión manual",
    descripcion: "El registro queda pendiente hasta que alguien decida qué hacer con él.",
    labelBoton: "Enviar a revisión",
  },
};

export const ESTADO_REGISTRO_META: Record<
  EstadoRegistroRetencion,
  { label: string; badgeVariant: BadgeVariant }
> = {
  [EstadoRegistroRetencion.ACTIVO]: { label: "Activo", badgeVariant: "success" },
  [EstadoRegistroRetencion.ARCHIVADO]: { label: "Archivado", badgeVariant: "neutral" },
  [EstadoRegistroRetencion.EN_REVISION]: { label: "En revisión", badgeVariant: "info" },
  [EstadoRegistroRetencion.BAJA_LOGICA]: { label: "Baja lógica", badgeVariant: "danger" },
};
