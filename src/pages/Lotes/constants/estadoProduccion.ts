import type { BadgeVariant } from "../../../components/ui/Badge";
import { EstadoProduccion } from "../../../types/consultaLotesProduccion.types";

// HU-77: etiquetas y formato compartidos por la consulta de lotes de
// producción y su detalle.

export const ESTADO_PRODUCCION_LABEL: Record<EstadoProduccion, string> = {
  [EstadoProduccion.SIN_CONSUMOS]: "Sin consumos",
  [EstadoProduccion.EN_PROCESO]: "En proceso",
  [EstadoProduccion.FINALIZADO]: "Finalizado",
};

export const ESTADO_PRODUCCION_VARIANT: Record<EstadoProduccion, BadgeVariant> = {
  [EstadoProduccion.SIN_CONSUMOS]: "neutral",
  [EstadoProduccion.EN_PROCESO]: "info",
  [EstadoProduccion.FINALIZADO]: "success",
};

// Siempre en hora AR, sin depender del huso del navegador (CA8).
export const FORMATO_FECHA_HORA_AR = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const FORMATO_FECHA_AR = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
