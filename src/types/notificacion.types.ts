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
  // HU-31: el backend detecta sensores que dejaron de mandar datos por más
  // de X minutos (ConfiguracionAlertaDesconexion / Sensor.umbralDesconexionMinutos)
  // y genera esta alerta para cada destinatario configurado en nivel CRITICA
  // (misma tabla que ya administra DestinatariosAlertasPage, HU-26/29).
  ALERTA_SENSOR_DESCONECTADO: "alerta_sensor_desconectado",
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

// HU-27: ciclo de vida de una alerta (Notificacion.estado en el backend —
// ver enums/estado-alerta.enum.ts, module/notificaciones,
// optilacteo-backend). Opcional/nullable en Notificacion porque solo se
// completa para tipo ALERTA_UMBRAL — el resto de notificaciones (ej.
// lote_no_apto) lo dejan null/undefined, igual que nivelAlerta arriba.
export const EstadoAlerta = {
  ABIERTA: "abierta",
  CERRADA: "cerrada",
} as const;

export type EstadoAlerta = (typeof EstadoAlerta)[keyof typeof EstadoAlerta];

export interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  mensaje: string;
  data?: Record<string, unknown> | null;
  nivelAlerta?: NivelAlerta | null;
  // HU-27
  estado?: EstadoAlerta | null;
  accionCorrectiva?: string | null;
  fechaResolucion?: string | null;
  // NotificacionMapper.toResponse (backend) siempre manda estos 4 campos a
  // nivel raíz, no solo para ALERTA_UMBRAL/ALERTA_SENSOR_DESCONECTADO — para
  // el resto de tipos (ej. lote_no_apto) quedan en null. loteId/loteCodigo/
  // parametro solo se completan para ALERTA_UMBRAL; sensorId solo para
  // ALERTA_SENSOR_DESCONECTADO (HU-31).
  loteId?: number | null;
  loteCodigo?: string | null;
  parametro?: string | null;
  sensorId?: number | null;
  leida: boolean;
  createdAt: string;
}

// Forma real de `data` cuando tipo === ALERTA_UMBRAL (ver
// NotificacionesService.generarAlertaPorUmbral en el backend).
//
// El índice de firma string->unknown no espeja nada del backend: es solo
// para que TS acepte que esto es un `AlertaUmbralData` es válido en el
// campo `data` de Notificacion (Record<string, unknown> | null) — sin él,
// AlertaNotificacion (abajo) no puede "extends Notificacion" con `data`
// restringido a este tipo (TS2430: los interfaces, a diferencia de los
// literales de objeto, no reciben una firma de índice implícita al
// compararse contra Record<string, unknown>). Ver esAlertaUmbral() y su uso
// en useAlertas.ts — sin este índice, el type predicate no tipaba y el
// .filter() de ahí dejaba de angostar el tipo silenciosamente.
export interface AlertaUmbralData {
  [key: string]: unknown;
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
  // HU-27: NotificacionMapper.toEntity (backend) siempre setea estado para
  // este tipo (nace "abierta"), y accionCorrectiva viaja en la misma
  // respuesta (null hasta que se resuelve la alerta). fechaResolucion queda
  // opcional, heredado de Notificacion tal cual — no se narrowea a
  // requerido para no pedirle ese campo al mock de HU-28
  // (historialAlertas.service.ts), que arma AlertaConCierre con `cerradaEn`
  // directo y no necesita tocarse por esto.
  estado: EstadoAlerta;
  accionCorrectiva: string | null;
}

// HU-31 fix: firma genérica en vez de fija a `AlertaNotificacion`. Antes,
// al llamarse sobre AlertaConCierre[] (unión que introdujo HU-31), el
// predicado no calzaba con el overload de .filter() que angosta por tipo
// (AlertaNotificacion no extiende AlertaConCierre, le falta `cerradaEn`),
// TS caía al overload boolean-only y devolvía AlertaConCierre[] sin
// angostar — rompía la asignación a ReglasActivasPanel (alertas:
// AlertaNotificacion[]). Con T genérico, Extract<T, {tipo: 'alerta_umbral'}>
// resuelve a AlertaUmbralConCierre cuando T = AlertaConCierre, y sigue
// resolviendo a AlertaNotificacion cuando T = AlertaNotificacion — mismo
// comportamiento en runtime, solo cambia lo que TS puede inferir.
export function esAlertaUmbral<T extends Notificacion>(
  n: T,
): n is Extract<T, { tipo: typeof TipoNotificacion.ALERTA_UMBRAL }> {
  return n.tipo === TipoNotificacion.ALERTA_UMBRAL && n.nivelAlerta != null && n.data != null;
}

// HU-31: forma real de `data` cuando tipo === ALERTA_SENSOR_DESCONECTADO
// (ver NotificacionesService.generarAlertaSensorDesconectado, backend).
// A diferencia de AlertaUmbralData, loteId/loteCodigo/parametro a nivel
// raíz de Notificacion quedan siempre null para este tipo — el backend
// nunca los popula acá (ver NotificacionMapper.toEntity, CrearNotificacionParams
// no recibe loteId/parametro en esta llamada). sensorId sí viene poblado
// a nivel raíz, además de repetirse en `data`.
export interface AlertaSensorDesconectadoData {
  [key: string]: unknown;
  sensorId: number;
  sensorNombre: string;
  ultimaLectura: string | null;
  minutosSinDatos: number;
}

// Vista angosta de Notificacion para la sección "Sensor desconectado" de
// HU-31, mismo criterio que AlertaNotificacion (HU-25) de arriba.
export interface AlertaSensorDesconectadoNotificacion extends Notificacion {
  tipo: typeof TipoNotificacion.ALERTA_SENSOR_DESCONECTADO;
  nivelAlerta: NivelAlerta;
  data: AlertaSensorDesconectadoData;
  estado: EstadoAlerta;
  accionCorrectiva: string | null;
  sensorId: number;
}

export function esAlertaSensorDesconectado(
  n: Notificacion,
): n is AlertaSensorDesconectadoNotificacion {
  return (
    n.tipo === TipoNotificacion.ALERTA_SENSOR_DESCONECTADO && n.nivelAlerta != null && n.data != null
  );
}

// GET /notificaciones ahora pagina (NotificacionPaginadaResponseDto en el
// backend) en vez de devolver un array plano.
export interface NotificacionPaginada {
  data: Notificacion[];
  total: number;
  page: number;
  limit: number;
}
