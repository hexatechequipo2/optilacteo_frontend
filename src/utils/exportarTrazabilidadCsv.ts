import type { EventoTrazabilidad } from "../types/trazabilidad.types";
import { formatearNumeroRemito } from "./numeroRemito";

// HU-69 (AC4): "la exportación del historial de trazabilidad incluye el
// número de remito entre las columnas del reporte" — no existe ningún
// export del lado del backend para esta pantalla (ver verificación de
// HU-69: no hay CSV/export en optilacteo-backend/src/module/lote), así que
// se arma acá, 100% client-side, mismo criterio que
// exportarGraficoEvolucionPng.ts (sin pegarle a ningún endpoint). El dato en
// sí sí es real: viene de GET /lotes/:id/trazabilidad.
interface ExportarTrazabilidadParams {
  codigoLote: string;
  proveedor: string;
  tambo: string;
  numeroRemito: string | null | undefined;
  eventos: EventoTrazabilidad[];
  nombreArchivo: string;
}

// Comillas dobles siempre, con "" para escapar comillas internas — evita que
// una coma o un salto de línea dentro de un campo (ej. una justificación
// larga) rompa las columnas del CSV.
function celda(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

export function exportarTrazabilidadCsv({
  codigoLote,
  proveedor,
  tambo,
  numeroRemito,
  eventos,
  nombreArchivo,
}: ExportarTrazabilidadParams): void {
  const filas: string[] = [];

  filas.push(["Lote", "Proveedor", "Tambo", "Nº de remito"].map(celda).join(","));
  filas.push(
    [codigoLote, proveedor, tambo, formatearNumeroRemito(numeroRemito)].map(celda).join(","),
  );
  filas.push("");
  filas.push(["Fecha", "Tipo de evento", "Descripción"].map(celda).join(","));

  for (const evento of eventos) {
    const fecha = new Date(evento.fecha).toLocaleString("es-AR");
    filas.push([fecha, evento.tipo, evento.descripcion].map(celda).join(","));
  }

  // BOM al inicio: sin esto, Excel en Windows interpreta el CSV como
  // ANSI y rompe las tildes/ñ de los datos reales del proveedor/tambo.
  const contenido = "﻿" + filas.join("\r\n");
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
