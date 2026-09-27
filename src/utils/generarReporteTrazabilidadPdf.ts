import { jsPDF } from "jspdf";
import { TipoEventoTrazabilidad, type EventoTrazabilidad } from "../types/trazabilidad.types";
import { formatearNumeroRemito } from "./numeroRemito";

// HU-45 (Sprint 5): "Reporte de trazabilidad de un lote específico", para
// presentar ante inspecciones del CAA/SENASA. Sin conexión a backend (no
// está desarrollado para esta fecha, según la tarea): el PDF se arma acá,
// 100% client-side con jsPDF, a partir de datos que YA vienen de endpoints
// reales (GET /lotes/:id/trazabilidad, HU-32) — no hay nada mockeado en el
// contenido, salvo la "firma digital" (ver firmaDigitalMock más abajo, que
// no es criptografía real). Mismo criterio que exportarTrazabilidadCsv.ts:
// no le pega a ningún endpoint nuevo.

const TIPO_EVENTO_LABEL: Record<TipoEventoTrazabilidad, string> = {
  [TipoEventoTrazabilidad.RECEPCION]: "Recepción",
  [TipoEventoTrazabilidad.CLASIFICACION]: "Análisis — Clasificación automática",
  [TipoEventoTrazabilidad.REVISION_CALIDAD]: "Análisis — Revisión de calidad",
  [TipoEventoTrazabilidad.CAMBIO_UBICACION]: "Decisión — Cambio de ubicación",
  [TipoEventoTrazabilidad.INGRESO_CAMARA]: "Decisión — Ingreso a cámara",
  [TipoEventoTrazabilidad.CONSUMO_PARCIAL]: "Decisión — Consumo hacia producción",
  [TipoEventoTrazabilidad.FINALIZACION]: "Decisión — Finalización",
  [TipoEventoTrazabilidad.RECOMENDACION_DESTINO]: "Destino — Recomendación productiva",
};

// Hash liviano y determinístico (mismo contenido → misma firma), solo para
// simular visualmente una "firma digital del sistema" (AC4). No es
// criptografía real — el día que el backend emita una firma real, esto se
// reemplaza sin tocar el resto del layout.
function firmaDigitalMock(contenido: string): string {
  let hash = 0;
  for (let i = 0; i < contenido.length; i++) {
    hash = (hash << 5) - hash + contenido.charCodeAt(i);
    hash |= 0;
  }
  const hex = (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
  return `OPTILACTEO-SIGN-${hex}-${contenido.length.toString(16).toUpperCase()}`;
}

interface GenerarReporteTrazabilidadParams {
  codigoLote: string;
  empresaNombre: string;
  empresaCuit?: string | null;
  proveedor: string;
  tambo: string;
  numeroRemito?: string | null;
  destinoVigente?: string | null;
  eventos: EventoTrazabilidad[];
}

const MARGEN = 15;
const ANCHO_UTIL = 210 - MARGEN * 2;

export function generarReporteTrazabilidadPdf({
  codigoLote,
  empresaNombre,
  empresaCuit,
  proveedor,
  tambo,
  numeroRemito,
  destinoVigente,
  eventos,
}: GenerarReporteTrazabilidadParams): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const fechaGeneracion = new Date();
  let y = MARGEN;

  const salirDeSiHaceFalta = (alturaNecesaria: number) => {
    if (y + alturaNecesaria > 297 - MARGEN) {
      doc.addPage();
      y = MARGEN;
    }
  };

  // Encabezado
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Reporte de trazabilidad de lote", MARGEN, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90);
  doc.text(`${empresaNombre}${empresaCuit ? ` · CUIT ${empresaCuit}` : ""}`, MARGEN, y);
  y += 5;
  doc.text(
    `Generado el ${fechaGeneracion.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    MARGEN,
    y,
  );
  y += 6;
  doc.setDrawColor(200);
  doc.line(MARGEN, y, 210 - MARGEN, y);
  y += 8;

  // Datos del lote
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`Lote ${codigoLote}`, MARGEN, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const datos: [string, string][] = [
    ["Proveedor", proveedor],
    ["Tambo de origen", tambo],
    ["Nº de remito", formatearNumeroRemito(numeroRemito)],
    ...(destinoVigente ? ([["Destino productivo", destinoVigente]] as [string, string][]) : []),
  ];
  for (const [label, valor] of datos) {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, MARGEN, y);
    doc.setFont("helvetica", "normal");
    doc.text(valor, MARGEN + 38, y);
    y += 6;
  }
  y += 4;

  // Línea de tiempo
  salirDeSiHaceFalta(14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Línea de tiempo del lote", MARGEN, y);
  y += 7;

  if (eventos.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110);
    doc.text("Este lote todavía no tiene eventos registrados más allá de la recepción.", MARGEN, y);
    y += 6;
  } else {
    for (const evento of eventos) {
      const etiqueta = TIPO_EVENTO_LABEL[evento.tipo] ?? evento.tipo;
      const fecha = new Date(evento.fecha).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      const descripcionLineas = doc.splitTextToSize(evento.descripcion, ANCHO_UTIL - 4);

      salirDeSiHaceFalta(10 + descripcionLineas.length * 5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(20);
      doc.text(`${fecha} — ${etiqueta}`, MARGEN, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(70);
      doc.text(descripcionLineas, MARGEN + 4, y);
      y += descripcionLineas.length * 5 + 3;
    }
  }

  // Firma digital del sistema (AC4)
  const contenidoParaFirma = JSON.stringify({
    codigoLote,
    empresaNombre,
    fechaGeneracion: fechaGeneracion.toISOString(),
    cantidadEventos: eventos.length,
  });
  const firma = firmaDigitalMock(contenidoParaFirma);

  salirDeSiHaceFalta(20);
  y += 4;
  doc.setDrawColor(200);
  doc.line(MARGEN, y, 210 - MARGEN, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(20);
  doc.text("Firma digital del sistema", MARGEN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(90);
  doc.text(firma, MARGEN, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(
    "Documento generado automáticamente por OptiLácteo. La firma digital certifica la integridad del",
    MARGEN,
    y,
  );
  y += 4;
  doc.text("contenido al momento de la generación.", MARGEN, y);

  // Numeración de página en todas las hojas
  const totalPaginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= totalPaginas; pagina++) {
    doc.setPage(pagina);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Página ${pagina} de ${totalPaginas}`, 210 - MARGEN, 297 - 10, { align: "right" });
  }

  const fechaArchivo = fechaGeneracion.toISOString().slice(0, 10);
  doc.save(`reporte-trazabilidad-${codigoLote}-${fechaArchivo}.pdf`);
}
