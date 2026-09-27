import axios from "axios";
import {
  AccionVencimiento,
  EntidadRetenible,
  EstadoRegistroRetencion,
  type PoliticaRetencion,
  type PoliticaRetencionInput,
  type RegistroRetencion,
} from "../types/retencion.types";
import {
  DIAS_AVISO_ANTICIPADO,
  RETENCION_MINIMA_MESES,
  resolverAccionPolitica,
  resolverEliminacion,
  sumarMeses,
  validarPeriodoRetencion,
} from "../utils/retencion";

// HU-48 (mock): política de retención y registros en localStorage. Los
// endpoints esperados están en retencion.types.ts (TODO(backend)). Las firmas
// son async y devuelven la misma forma que devolvería la API, así que
// conectarlo es reemplazar el cuerpo de cada método por la llamada a `api`.
//
// Las validaciones de acá (período < 24, acciones bloqueadas) simulan el 400
// que tendría que devolver el backend — no reemplazan al chequeo de UI.

const STORAGE_POLITICA = "optilacteo:retencion:politica";
// Semilla generada una sola vez, con fechas relativas al día en que se crea
// (ver generarSemilla). Borrar esta key regenera los datos.
const STORAGE_REGISTROS = "optilacteo:retencion:registros";
export const EVENTO_RETENCION_ACTUALIZADA = "optilacteo:retencion:actualizado";

// [entidad, referencia, días para cumplir 24 meses el día de la semilla]
const SEMILLA: [EntidadRetenible, string, number][] = [
  [EntidadRetenible.LOTE, "Lote L-0412", -35],
  [EntidadRetenible.REGISTRO_AUDITORIA, "Auditoría #3187 · edición de lote", -8],
  [EntidadRetenible.MEDICION, "Medición #20411 · L-0415", 0],
  [EntidadRetenible.CONSUMO_LOTE, "Consumo #611 · L-0415", 4],
  [EntidadRetenible.LOTE, "Lote L-0421", 11],
  [EntidadRetenible.MEDICION, "Medición #20877 · L-0421", 18],
  [EntidadRetenible.REGISTRO_AUDITORIA, "Auditoría #3402 · cambio de umbral", 27],
  [EntidadRetenible.CONSUMO_LOTE, "Consumo #648 · L-0430", 39],
  [EntidadRetenible.LOTE, "Lote L-0433", 52],
  [EntidadRetenible.MEDICION, "Medición #21390 · L-0433", 59],
  [EntidadRetenible.LOTE, "Lote L-0470", 96],
  [EntidadRetenible.CONSUMO_LOTE, "Consumo #702 · L-0470", 150],
  [EntidadRetenible.MEDICION, "Medición #23015 · L-0512", 240],
  [EntidadRetenible.REGISTRO_AUDITORIA, "Auditoría #4120 · alta de usuario", 410],
];

function generarSemilla(): RegistroRetencion[] {
  return SEMILLA.map(([entidad, referencia, diasParaVencer], index) => {
    const vencimiento = new Date();
    vencimiento.setHours(10, 30, 0, 0);
    vencimiento.setDate(vencimiento.getDate() + diasParaVencer);
    return {
      id: index + 1,
      entidad,
      referencia,
      fechaCreacion: sumarMeses(vencimiento, -RETENCION_MINIMA_MESES).toISOString(),
      estado: EstadoRegistroRetencion.ACTIVO,
    };
  });
}

function politicaPorDefecto(): PoliticaRetencion {
  return {
    periodoMeses: RETENCION_MINIMA_MESES,
    accionAlVencer: AccionVencimiento.ARCHIVAR,
    avisoAnticipado: { activo: true, diasAntes: DIAS_AVISO_ANTICIPADO },
    actualizadoEn: new Date().toISOString(),
  };
}

function leer<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function escribir(key: string, valor: unknown) {
  localStorage.setItem(key, JSON.stringify(valor));
  window.dispatchEvent(new Event(EVENTO_RETENCION_ACTUALIZADA));
}

// La default se persiste en la primera lectura para que actualizadoEn sea
// estable entre lecturas (el form del tab se re-inicializa cuando cambia).
function leerPolitica(): PoliticaRetencion {
  const guardada = leer<PoliticaRetencion>(STORAGE_POLITICA);
  if (guardada) return guardada;
  const porDefecto = politicaPorDefecto();
  localStorage.setItem(STORAGE_POLITICA, JSON.stringify(porDefecto));
  return porDefecto;
}

function leerRegistros(): RegistroRetencion[] {
  const guardados = leer<RegistroRetencion[]>(STORAGE_REGISTROS);
  if (guardados) return guardados;
  const semilla = generarSemilla();
  localStorage.setItem(STORAGE_REGISTROS, JSON.stringify(semilla));
  return semilla;
}

function actualizarRegistro(
  entidad: EntidadRetenible,
  id: number,
  cambio: (registro: RegistroRetencion) => RegistroRetencion,
): RegistroRetencion {
  const registros = leerRegistros();
  const actual = registros.find((r) => r.entidad === entidad && r.id === id);
  if (!actual) throw new Error("El registro no existe.");
  const actualizado = cambio(actual);
  escribir(
    STORAGE_REGISTROS,
    registros.map((r) => (r === actual ? actualizado : r)),
  );
  return actualizado;
}

export const retencionService = {
  // TODO(backend): GET /config-retencion
  getPolitica: async (): Promise<PoliticaRetencion> => leerPolitica(),

  // TODO(backend): PUT /config-retencion
  guardarPolitica: async (input: PoliticaRetencionInput): Promise<PoliticaRetencion> => {
    const error = validarPeriodoRetencion(input.periodoMeses);
    if (error) throw new Error(error);
    const politica: PoliticaRetencion = { ...input, actualizadoEn: new Date().toISOString() };
    escribir(STORAGE_POLITICA, politica);
    return politica;
  },

  // TODO(backend): GET /retencion/registros?diasHasta=60. El mock devuelve
  // todos; el filtro y el orden los hace useRetencion para que contadores y
  // listado salgan del mismo array.
  getRegistros: async (): Promise<RegistroRetencion[]> => leerRegistros(),

  // TODO(backend): PATCH /retencion/registros/:entidad/:id/aplicar-politica
  aplicarAccionPolitica: async (
    entidad: EntidadRetenible,
    id: number,
  ): Promise<RegistroRetencion> => {
    const politica = leerPolitica();
    return actualizarRegistro(entidad, id, (registro) => {
      const resolucion = resolverAccionPolitica(registro, politica);
      if (resolucion.tipo === "bloqueada") throw new Error(resolucion.motivo);
      if (resolucion.tipo === "sin_accion") throw new Error(resolucion.ayuda);
      return {
        ...registro,
        estado:
          resolucion.accion === AccionVencimiento.ARCHIVAR
            ? EstadoRegistroRetencion.ARCHIVADO
            : EstadoRegistroRetencion.EN_REVISION,
      };
    });
  },

  // TODO(backend): PATCH /retencion/registros/:entidad/:id/baja-logica. No hay
  // método de eliminación física: ninguna entidad retenible es no crítica hoy
  // (ver ENTIDADES_CRITICAS).
  darDeBaja: async (entidad: EntidadRetenible, id: number): Promise<RegistroRetencion> => {
    const politica = leerPolitica();
    return actualizarRegistro(entidad, id, (registro) => {
      const resolucion = resolverEliminacion(registro, politica);
      if (resolucion.tipo === "bloqueada") throw new Error(resolucion.motivo);
      if (resolucion.tipo !== "baja_logica") throw new Error(resolucion.ayuda);
      return { ...registro, estado: EstadoRegistroRetencion.BAJA_LOGICA };
    });
  },
};

// Contempla los dos orígenes: el Error del mock y el 400 de axios que va a
// devolver el backend real.
export function extraerMensajeError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    const { message } = err.response.data;
    return Array.isArray(message) ? message.join(" ") : message;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
