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
  // HU-50: el backend consulta al microservicio ML (AnomaliaService.evaluarAnomalia,
  // llamado best-effort desde el registro de cada medición) y genera esta
  // alerta cuando detecta un patrón inusual — a diferencia de ALERTA_UMBRAL,
  // no depende de un umbral configurado sino de un modelo entrenado. Nunca
  // trae nivelAlerta ni data.valor/umbralMin/umbralMax (ver AlertaAnomaliaData
  // más abajo): es una forma de datos distinta, no una variante de alerta_umbral.
  ALERTA_ANOMALIA: "alerta_anomalia",
} as const;

export type TipoNotificacion = (typeof TipoNotificacion)[keyof typeof TipoNotificacion];

// HU-50: tipo de desvío detectado por el modelo ML de anomalías (ver
// enums/tipo-desvio-anomalia.enum.ts, backend). Solo se completa para
// notificaciones de tipo ALERTA_ANOMALIA.
export const TipoDesvioAnomalia = {
  PICO: "pico",
  TENDENCIA: "tendencia",
  VARIANZA_ATIPICA: "varianza_atipica",
  NIVEL_ATIPICO: "nivel_atipico",
} as const;

export type TipoDesvioAnomalia = (typeof TipoDesvioAnomalia)[keyof typeof TipoDesvioAnomalia];

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
// HU-50 criterio 4: solo se llega a este estado marcando una alerta_anomalia
// como falso positivo (PATCH /notificaciones/:id/falso-positivo, endpoint
// separado de /resolver — ver NotificacionesService.marcarFalsoPositivo en
// el backend). El backend exige que la alerta esté ABIERTA para permitir la
// transición; una vez en FALSO_POSITIVO no hay forma de revertirla.
export const EstadoAlerta = {
  ABIERTA: "abierta",
  CERRADA: "cerrada",
  FALSO_POSITIVO: "falso_positivo",
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
  // HU-50: NotificacionMapper.toResponse (backend) manda estos 5 campos a
  // nivel raíz para toda notificación, igual que nivelAlerta/estado arriba —
  // solo se completan (no quedan null) para tipo ALERTA_ANOMALIA.
  tipoDesvio?: TipoDesvioAnomalia | null;
  confianza?: number | null;
  modeloVersion?: string | null;
  marcadaFalsoPositivoPorId?: number | null;
  fechaMarcadoFalsoPositivo?: string | null;
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

// HU-50: forma real de `data` cuando tipo === ALERTA_ANOMALIA (ver
// AnomaliaService.evaluarAnomalia, backend). A diferencia de AlertaUmbralData,
// no hay valor/umbralMin/umbralMax/desvioPorcentaje/nivelAlerta — el modelo
// ML no compara contra un umbral configurado, así que esos campos no
// existen para este tipo (queda fuera de alcance el gráfico de serie
// histórica que mostraría el patrón detectado: el DTO no expone ninguna
// serie, solo el resultado puntual de la detección).
export interface AlertaAnomaliaData {
  [key: string]: unknown;
  loteId: number;
  loteCodigo: string;
  parametro: Parametro;
  tipoDesvio: TipoDesvioAnomalia;
  confianza: number;
  modeloVersion: string;
}

// Vista angosta de Notificacion para HU-50: mismo criterio que
// AlertaSensorDesconectadoNotificacion (HU-31) arriba — tipo estructuralmente
// distinto a AlertaNotificacion (alerta_umbral), no una variante con
// tipoDesvio encima. Nunca trae nivelAlerta (el backend no lo setea para
// este tipo, ver NotificacionMapper.toEntity/AnomaliaService).
export interface AlertaAnomaliaNotificacion extends Notificacion {
  tipo: typeof TipoNotificacion.ALERTA_ANOMALIA;
  tipoDesvio: TipoDesvioAnomalia;
  confianza: number;
  modeloVersion: string;
  data: AlertaAnomaliaData;
  estado: EstadoAlerta;
  // Nunca se completa para este tipo (no pasa por el flujo de accionCorrectiva
  // de HU-27, ver comentario en AlertaAnomaliaConCierre) — se narrowea a
  // requerido igual que en AlertaNotificacion/AlertaSensorDesconectadoNotificacion
  // solo para que CierreAlerta ("accionCorrectiva: string | null") no choque
  // con el opcional heredado de Notificacion.
  accionCorrectiva: string | null;
  marcadaFalsoPositivoPorId: number | null;
  fechaMarcadoFalsoPositivo: string | null;
}

export function esAlertaAnomalia(n: Notificacion): n is AlertaAnomaliaNotificacion {
  return n.tipo === TipoNotificacion.ALERTA_ANOMALIA && n.tipoDesvio != null && n.data != null;
}

// GET /notificaciones ahora pagina (NotificacionPaginadaResponseDto en el
// backend) en vez de devolver un array plano.
export interface NotificacionPaginada {
  data: Notificacion[];
  total: number;
  page: number;
  limit: number;
}
