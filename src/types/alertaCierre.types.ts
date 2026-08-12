// HU-27 (Registro y cierre de alertas): el backend todavía no tiene el
// concepto de "alerta cerrada" — Notificacion/AlertaUmbralData
// (notificacion.types.ts) espejan el DTO real 1:1 y no incluyen esto, así
// que separamos el modelo acá en vez de mezclarlo con los tipos que sí
// vienen del backend. Ver TODO(backend) en services/alertaCierre.service.ts.
import type { AlertaNotificacion } from "./notificacion.types";

export const EstadoAlerta = {
  ABIERTA: "abierta",
  CERRADA: "cerrada",
} as const;

export type EstadoAlerta = (typeof EstadoAlerta)[keyof typeof EstadoAlerta];

export interface CierreAlerta {
  estado: EstadoAlerta;
  accionCorrectiva: string | null;
  cerradaEn: string | null;
}

// AlertaNotificacion (HU-25) + el estado de cierre mockeado (HU-27). Superset
// de AlertaNotificacion a propósito: todo lo que ya consume AlertaNotificacion
// (AlertaCard, ReglasActivasPanel, etc.) sigue funcionando sin cambios.
export interface AlertaConCierre extends AlertaNotificacion, CierreAlerta {}
