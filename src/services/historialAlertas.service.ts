// TODO(backend): HU-28 pide consultar el historial de alertas por
// lote/nivel/período para análisis regulatorio, pero no existe endpoint
// para esto todavía — GET /notificaciones (HU-21/25) no filtra por lote ni
// por rango de fechas server-side, y no tiene un modo "sin paginar todo el
// histórico". Cuando el backend exponga algo como GET /alertas/historial
// (query params: loteId, nivel, estado, fechaInicio, fechaFin, page, limit)
// reemplazar getHistorial() de acá por un `api.get(..., { params: filters })`
// — mismo patrón que historialMedicionesService.getHistorial — y los dos
// export por un GET .../export?formato=excel|pdf con responseType: "blob"
// (mismo patrón que historialMedicionesService.exportCsv), total o
// parcialmente delegado al backend según lo que ese endpoint termine
// devolviendo. El resto de la pantalla (hook, filtros, tabla) no debería
// necesitar cambios: ya manda los filtros como si fueran query params y
// nunca trae "todo" para filtrar en memoria (AC4: la consulta debe
// responder rápido incluso con rangos de 90 días).
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { NivelAlerta, TipoNotificacion } from "../types/notificacion.types";
import { Parametro, TipoMateriaPrima } from "../types/configParametro.types";
import { EstadoAlerta } from "../types/alertaCierre.types";
import type {
  HistorialAlertaItem,
  HistorialAlertasFilterQuery,
  HistorialAlertasResponse,
} from "../types/historialAlertas.types";
import { NIVEL_ALERTA_META, ESTADO_ALERTA_META } from "../pages/Alertas/constants/alertas.constants";
import { PARAMETRO_LABEL } from "../pages/Sensores/constants/parametroSensor";

// PRNG determinístico (mulberry32): el dataset mock tiene que ser estable
// entre renders/recargas de la página — con Math.random() cada filtro
// dispararía un dataset "nuevo" y sería imposible verificar visualmente que
// un filtro realmente redujo el resultado esperado.
function crearGenerador(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function elegir<T>(rng: () => number, opciones: readonly T[]): T {
  return opciones[Math.floor(rng() * opciones.length)];
}

const LOTES_MOCK = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  codigo: `LOTE-1-${String(i + 1).padStart(5, "0")}`,
}));

const NIVELES_PONDERADOS: readonly NivelAlerta[] = [
  ...Array(5).fill(NivelAlerta.INFORMATIVA),
  ...Array(4).fill(NivelAlerta.ADVERTENCIA),
  ...Array(2).fill(NivelAlerta.CRITICA),
];

const PARAMETROS: readonly Parametro[] = Object.values(Parametro);
const MATERIAS_PRIMA: readonly TipoMateriaPrima[] = Object.values(TipoMateriaPrima);

const ACCIONES_CORRECTIVAS = [
  "Se recalibró el sensor y se repitió la medición dentro de rango.",
  "Se descartó el lote afectado por desvío sostenido de temperatura.",
  "Se ajustó manualmente el parámetro y se documentó en bitácora de planta.",
  "Se notificó a Responsable de producción; sin acción sobre el lote.",
  "Se reprocesó la materia prima antes de continuar con producción.",
];

const DIAS_HISTORIAL = 90;
const CANTIDAD_MOCK = 280;

// Genera una sola vez, a nivel de módulo (mismo criterio que
// alertaCierreService: sobrevive mientras la pestaña esté abierta). Se
// genera ordenado desc por fecha, como devolvería el backend real.
function generarHistorialMock(): HistorialAlertaItem[] {
  const rng = crearGenerador(280628); // seed fija, no una fecha real
  const ahora = Date.now();

  const items: HistorialAlertaItem[] = Array.from({ length: CANTIDAD_MOCK }, (_, i) => {
    const diasAtras = rng() * DIAS_HISTORIAL;
    const createdAt = new Date(ahora - diasAtras * 24 * 60 * 60 * 1000).toISOString();
    const lote = elegir(rng, LOTES_MOCK);
    const parametro = elegir(rng, PARAMETROS);
    const nivelAlerta = elegir(rng, NIVELES_PONDERADOS);
    const desvioPorcentaje =
      nivelAlerta === NivelAlerta.CRITICA
        ? 15 + rng() * 20
        : nivelAlerta === NivelAlerta.ADVERTENCIA
          ? 5 + rng() * 10
          : rng() * 5;
    const umbralMin = 4 + rng() * 2;
    const umbralMax = umbralMin + 3 + rng() * 2;
    const valor = umbralMax * (1 + desvioPorcentaje / 100);

    // Alertas más viejas tienen más chance de estar cerradas — simula un
    // flujo de trabajo real en vez de un 50/50 parejo en todo el rango.
    const estaCerrada = rng() < Math.min(0.9, 0.3 + diasAtras / DIAS_HISTORIAL);

    return {
      id: i + 1,
      tipo: TipoNotificacion.ALERTA_UMBRAL,
      mensaje: `Desvío de ${PARAMETRO_LABEL[parametro]} en ${lote.codigo}`,
      nivelAlerta,
      leida: true,
      createdAt,
      data: {
        loteId: lote.id,
        loteCodigo: lote.codigo,
        parametro,
        materiaPrima: elegir(rng, MATERIAS_PRIMA),
        valor: Number(valor.toFixed(2)),
        umbralMin: Number(umbralMin.toFixed(2)),
        umbralMax: Number(umbralMax.toFixed(2)),
        desvioPorcentaje: Number(desvioPorcentaje.toFixed(1)),
        nivelAlerta,
        timestamp: createdAt,
      },
      estado: estaCerrada ? EstadoAlerta.CERRADA : EstadoAlerta.ABIERTA,
      accionCorrectiva: estaCerrada ? elegir(rng, ACCIONES_CORRECTIVAS) : null,
      cerradaEn: estaCerrada ? createdAt : null,
    };
  });

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const HISTORIAL_MOCK = generarHistorialMock();

// Filtra el dataset completo — es la parte que se va a reemplazar por el
// query real al backend. A propósito no vive en el hook ni en la página:
// nada arriba de esta función debería tener que cambiar cuando deje de ser
// un array en memoria.
function filtrar(filters: HistorialAlertasFilterQuery): HistorialAlertaItem[] {
  return HISTORIAL_MOCK.filter((item) => {
    if (filters.loteId != null && item.data.loteId !== filters.loteId) return false;
    if (filters.nivel && item.nivelAlerta !== filters.nivel) return false;

    const fecha = new Date(item.createdAt);
    if (filters.fechaInicio && fecha < new Date(filters.fechaInicio)) return false;
    if (filters.fechaFin) {
      const limite = new Date(filters.fechaFin);
      limite.setHours(23, 59, 59, 999);
      if (fecha > limite) return false;
    }
    return true;
  });
}

const FILA_EXPORT_HEADERS = ["Fecha", "Lote", "Parámetro", "Nivel", "Estado", "Acción correctiva"];

function aFilaExport(item: HistorialAlertaItem): string[] {
  return [
    new Date(item.createdAt).toLocaleString("es-AR"),
    item.data.loteCodigo,
    PARAMETRO_LABEL[item.data.parametro],
    NIVEL_ALERTA_META[item.nivelAlerta].label,
    ESTADO_ALERTA_META[item.estado].label,
    item.accionCorrectiva ?? "—",
  ];
}

function nombreArchivo(extension: string): string {
  return `historial-alertas-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

export const historialAlertasService = {
  getHistorial: async (
    filters: HistorialAlertasFilterQuery = {},
  ): Promise<HistorialAlertasResponse> => {
    const { page = 1, limit = 20 } = filters;
    const filtrado = filtrar(filters);
    const inicio = (page - 1) * limit;

    return {
      data: filtrado.slice(inicio, inicio + limit),
      total: filtrado.length,
      page,
      limit,
    };
  },

  // AC3: exporta TODO lo que matchea los filtros (no solo la página actual
  // en pantalla) — igual que exportCsv en historialMediciones.service.ts.
  exportExcel: async (
    filters: Omit<HistorialAlertasFilterQuery, "page" | "limit"> = {},
  ): Promise<void> => {
    const filas = filtrar(filters).map(aFilaExport);
    const hoja = XLSX.utils.aoa_to_sheet([FILA_EXPORT_HEADERS, ...filas]);
    hoja["!cols"] = [{ wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 50 }];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Historial de alertas");
    XLSX.writeFile(libro, nombreArchivo("xlsx"));
  },

  exportPdf: async (
    filters: Omit<HistorialAlertasFilterQuery, "page" | "limit"> = {},
  ): Promise<void> => {
    const filas = filtrar(filters).map(aFilaExport);

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Historial de alertas", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generado el ${new Date().toLocaleString("es-AR")} · ${filas.length} registros`, 14, 21);

    autoTable(doc, {
      head: [FILA_EXPORT_HEADERS],
      body: filas,
      startY: 26,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [61, 111, 207] },
    });

    doc.save(nombreArchivo("pdf"));
  },
};
