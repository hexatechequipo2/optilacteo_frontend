import {
  AccionVencimiento,
  ClasificacionRetencion,
  EntidadRetenible,
  EstadoRegistroRetencion,
  type PoliticaRetencion,
  type RegistroRetencion,
  type ResolucionAccionPolitica,
  type ResolucionEliminacion,
} from "../types/retencion.types";

// HU-48: regla de retención centralizada. Todo cálculo de vencimiento y todo
// chequeo de "¿se puede borrar esto?" pasa por acá — no reimplementarlo en
// componentes.
//
// Hay dos conceptos separados a propósito:
//   - resolverAccionPolitica: qué hacer al cumplirse el período (archivar /
//     conservar activo / revisión manual). Aplica a todas las entidades y no
//     es destructiva.
//   - resolverEliminacion: intento de borrar. Piso normativo de 24 meses
//     (puedeEliminar) + modoBaja (crítica → baja lógica, nunca física).
//
// Hoy Lotes, Mediciones, Consumos de lote y Registros de auditoría NO
// exponen ninguna acción de eliminación en la UI (verificado: lote.service,
// loteConsumo.service, medicionManual.service, historialMediciones.service y
// auditLog.service no tienen DELETE, y AuditoriaPage es de solo lectura por
// HU-43). El único consumidor actual es la tabla de RetencionDatosTab.
// puedeEliminar() y modoBaja() son los puntos de enganche: cualquier acción
// de borrado que se agregue a esas pantallas tiene que pasar primero por acá.
//
// La regla NO recibe rol a propósito: la HU pide bloquear incluso a roles
// altos, así que no hay bypass por Gerente/Administrador.
//
// TODO(backend): esto es defensa de UI. El bloqueo real tiene que estar en
// el backend (un DELETE directo a la API lo saltearía).

export const RETENCION_MINIMA_MESES = 24;
export const DIAS_AVISO_ANTICIPADO = 60;

export const MENSAJE_NORMATIVO_RETENCION =
  `No se puede configurar un período menor a ${RETENCION_MINIMA_MESES} meses: las ` +
  "resoluciones del SENASA y la normativa del Código Alimentario Argentino (CAA) " +
  "exigen conservar los registros de trazabilidad y calidad durante al menos ese plazo.";

export const MENSAJE_BLOQUEO_NORMATIVO =
  `Este registro tiene menos de ${RETENCION_MINIMA_MESES} meses de antigüedad. Por las ` +
  "resoluciones del SENASA y la normativa del CAA no puede eliminarse, archivarse ni " +
  "darse de baja, cualquiera sea el rol del usuario.";

// Entidades cuya eliminación física rompería la trazabilidad (origen →
// mediciones → uso de materia prima → auditoría): cumplido el período solo
// admiten baja lógica. Hoy son las cuatro; modoBaja conserva la rama "no
// crítica" para cuando se sume una entidad retenible que sí pueda borrarse.
export const ENTIDADES_CRITICAS: ReadonlySet<EntidadRetenible> = new Set([
  EntidadRetenible.LOTE,
  EntidadRetenible.MEDICION,
  EntidadRetenible.CONSUMO_LOTE,
  EntidadRetenible.REGISTRO_AUDITORIA,
]);

const MS_POR_DIA = 86_400_000;
const REGEX_SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

// null = válido. Recibe string porque viene directo del input.
export function validarPeriodoRetencion(valor: string | number): string | null {
  const texto = String(valor).trim();
  if (texto === "") return "Ingresá el período de conservación en meses.";
  const meses = Number(texto);
  if (!Number.isInteger(meses)) return "El período tiene que ser una cantidad entera de meses.";
  if (meses < RETENCION_MINIMA_MESES) return MENSAJE_NORMATIVO_RETENCION;
  return null;
}

// new Date("2024-09-27") se interpreta como medianoche UTC, que en
// Argentina (UTC-3) es el 26/09 a las 21:00 — correría todo un día. Una
// fecha sin hora se arma como fecha local; un ISO completo se respeta tal
// cual y se lleva al día local.
export function parsearFechaLocal(valor: string): Date {
  const soloFecha = REGEX_SOLO_FECHA.exec(valor);
  const fecha = soloFecha
    ? new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]))
    : new Date(valor);
  return inicioDelDia(fecha);
}

function inicioDelDia(fecha: Date): Date {
  const resultado = new Date(fecha);
  resultado.setHours(0, 0, 0, 0);
  return resultado;
}

// Suma (o resta) meses de calendario; si el día no existe en el mes destino
// (31/01 + 1 mes) cae al último día de ese mes en vez de desbordar al
// siguiente.
export function sumarMeses(fecha: Date, meses: number): Date {
  const resultado = new Date(fecha);
  resultado.setDate(1);
  resultado.setMonth(resultado.getMonth() + meses);
  const ultimoDiaDelMes = new Date(resultado.getFullYear(), resultado.getMonth() + 1, 0).getDate();
  resultado.setDate(Math.min(fecha.getDate(), ultimoDiaDelMes));
  return resultado;
}

export function fechaVencimiento(fechaCreacion: string, periodoMeses: number): Date {
  return sumarMeses(parsearFechaLocal(fechaCreacion), periodoMeses);
}

// Positivo = faltan N días; 0 = vence hoy; negativo = vencido hace N días.
// Math.round y no floor/ceil para absorber días de 23/25 h.
//
// Caso de control: hoy = 2026-09-27, fechaCreacion = "2024-09-27" (o
// "2024-09-27T10:30:00-03:00"), periodoMeses = 24 → vencimiento 2026-09-27
// → diasRestantes === 0 (no -1, que es lo que daba new Date("2024-09-27")
// en UTC-3).
export function diasRestantes(
  fechaCreacion: string,
  periodoMeses: number,
  hoy: Date = new Date(),
): number {
  const vencimiento = fechaVencimiento(fechaCreacion, periodoMeses);
  return Math.round((vencimiento.getTime() - inicioDelDia(hoy).getTime()) / MS_POR_DIA);
}

export function clasificarRegistro(
  dias: number,
  diasAviso: number = DIAS_AVISO_ANTICIPADO,
): ClasificacionRetencion {
  if (dias <= 0) return ClasificacionRetencion.VENCIDO;
  if (dias <= diasAviso) return ClasificacionRetencion.PROXIMO_A_VENCER;
  return ClasificacionRetencion.PROTEGIDO;
}

// Piso normativo fijo de 24 meses, independiente del período que configure
// la empresa (que puede ser mayor). Punto de enganche para cualquier botón
// de eliminar del sistema.
export function puedeEliminar(
  fechaCreacion: string,
  hoy: Date = new Date(),
): { permitido: true } | { permitido: false; motivo: string } {
  return diasRestantes(fechaCreacion, RETENCION_MINIMA_MESES, hoy) <= 0
    ? { permitido: true }
    : { permitido: false, motivo: MENSAJE_BLOQUEO_NORMATIVO };
}

export function modoBaja(entidad: EntidadRetenible): "baja_logica" | "eliminacion_fisica" {
  return ENTIDADES_CRITICAS.has(entidad) ? "baja_logica" : "eliminacion_fisica";
}

// Dos bloqueos con mensajes distintos: primero el piso normativo (24 meses,
// cita SENASA/CAA) y después el período propio de la empresa, que puede ser
// mayor. null = ambos cumplidos.
function motivoBloqueoRetencion(
  fechaCreacion: string,
  politica: PoliticaRetencion,
  hoy: Date,
): string | null {
  const normativo = puedeEliminar(fechaCreacion, hoy);
  if (!normativo.permitido) return normativo.motivo;

  const dias = diasRestantes(fechaCreacion, politica.periodoMeses, hoy);
  if (dias > 0) {
    return (
      `La política de la empresa conserva los registros ${politica.periodoMeses} meses. ` +
      `Faltan ${dias} días para que se cumpla el período.`
    );
  }
  return null;
}

export function resolverAccionPolitica(
  registro: RegistroRetencion,
  politica: PoliticaRetencion,
  hoy: Date = new Date(),
): ResolucionAccionPolitica {
  if (registro.estado !== EstadoRegistroRetencion.ACTIVO) {
    return {
      tipo: "sin_accion",
      ayuda: "La acción de la política ya se aplicó o el registro fue dado de baja.",
    };
  }

  const motivo = motivoBloqueoRetencion(registro.fechaCreacion, politica, hoy);
  if (motivo) return { tipo: "bloqueada", motivo };

  if (politica.accionAlVencer === AccionVencimiento.CONSERVAR_ACTIVO) {
    return {
      tipo: "sin_accion",
      ayuda: "La política vigente conserva activo el registro una vez cumplido el período.",
    };
  }

  return {
    tipo: "disponible",
    accion: politica.accionAlVencer,
    ayuda: "Período cumplido: se aplica la acción definida en la política de retención.",
  };
}

export function resolverEliminacion(
  registro: RegistroRetencion,
  politica: PoliticaRetencion,
  hoy: Date = new Date(),
): ResolucionEliminacion {
  if (registro.estado === EstadoRegistroRetencion.BAJA_LOGICA) {
    return { tipo: "sin_accion", ayuda: "El registro ya fue dado de baja lógica." };
  }

  const motivo = motivoBloqueoRetencion(registro.fechaCreacion, politica, hoy);
  if (motivo) return { tipo: "bloqueada", motivo };

  if (modoBaja(registro.entidad) === "baja_logica") {
    return {
      tipo: "baja_logica",
      ayuda:
        "Entidad crítica para la trazabilidad: se da de baja lógica (queda inactiva " +
        "pero consultable), nunca se elimina físicamente.",
    };
  }

  // Sin uso hoy: todas las entidades retenibles son críticas.
  return {
    tipo: "eliminacion_fisica",
    ayuda: "Período cumplido y entidad no crítica: se permite la eliminación.",
  };
}
