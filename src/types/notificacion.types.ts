// Espeja NotificacionResponseDto (optilacteo-backend, src/module/notificaciones).
// HU-21 (AC4): se crea una fila por cada Responsable de Calidad de la
// empresa cuando un lote se clasifica No Apto, y se emite en tiempo real
// por WS (namespace /notificaciones, evento "notificacion:nueva"). GET
// /notificaciones no tiene @Roles(): cada usuario ve solo las suyas.
//
// HU-25: mismo módulo, tipo nuevo. Cuando una lectura de sensor queda fuera
// del umbral configurado (ConfigParametro, HU-09) el backend genera y emite
// una notificación con tipo ALERTA_UMBRAL a cada Responsable de producción
// de la empresa (NotificacionesService.generarAlertaPorUmbral).
import type { Parametro, TipoMateriaPrima } from "./configParametro.types";

export const TipoNotificacion = {
  LOTE_NO_APTO: "lote_no_apto",
  ALERTA_UMBRAL: "alerta_umbral",
} as const;

export type TipoNotificacion = (typeof TipoNotificacion)[keyof typeof TipoNotificacion];

// Severidad del desvío respecto al umbral configurado (nivelAlerta en el
// backend). Solo se completa para tipo ALERTA_UMBRAL — el resto de
// notificaciones (ej. lote_no_apto) lo dejan null/undefined.
// Cortes reales (NotificacionesService.determinarNivelAlerta, backend):
// desvío <=5% -> informativa, <15% -> advertencia, resto -> critica.
export const NivelAlerta = {
  INFORMATIVA: "informativa",
  ADVERTENCIA: "advertencia",
  CRITICA: "critica",
} as const;

export type NivelAlerta = (typeof NivelAlerta)[keyof typeof NivelAlerta];

export interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  mensaje: string;
  data?: Record<string, unknown> | null;
  nivelAlerta?: NivelAlerta | null;
  leida: boolean;
  createdAt: string;
}

// Forma real de `data` cuando tipo === ALERTA_UMBRAL (ver
// NotificacionesService.generarAlertaPorUmbral en el backend).
export interface AlertaUmbralData {
  loteId: number;
  loteCodigo: string;
  parametro: Parametro;
  materiaPrima: TipoMateriaPrima;
  valor: number;
  umbralMin: number;
  umbralMax: number;
  desvioPorcentaje: number;
  nivelAlerta: NivelAlerta;
  timestamp: string;
}

// Vista angosta de Notificacion para HU-25 (pantalla "Monitoreo y
// Alertas"): mismo objeto que devuelve el backend, pero con `data` y
// `nivelAlerta` ya tipados en vez de Record<string, unknown> | null.
export interface AlertaNotificacion extends Notificacion {
  tipo: typeof TipoNotificacion.ALERTA_UMBRAL;
  nivelAlerta: NivelAlerta;
  data: AlertaUmbralData;
}

export function esAlertaUmbral(n: Notificacion): n is AlertaNotificacion {
  return n.tipo === TipoNotificacion.ALERTA_UMBRAL && n.nivelAlerta != null && n.data != null;
}

// GET /notificaciones ahora pagina (NotificacionPaginadaResponseDto en el
// backend) en vez de devolver un array plano.
export interface NotificacionPaginada {
  data: Notificacion[];
  total: number;
  page: number;
  limit: number;
}
