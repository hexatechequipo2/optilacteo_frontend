import type {
  IndicadorEvolucionConfig,
  PuntoSerieEvolucion,
  TipoGraficoEvolucion,
} from "../types/indicadorEvolucion.types";

// HU-39 (mejora post-QA): la primera versión exportaba el <svg> tal cual
// (serializado a canvas) — como el título, la leyenda y las fechas del eje
// viven como HTML alrededor del SVG, el PNG resultante era solo líneas sobre
// fondo blanco, sin ninguna referencia de qué se estaba mirando. Esta
// versión dibuja el gráfico entero directo en un <canvas> (título,
// subtítulo, leyenda con rango real por indicador, grilla, líneas/barras,
// marcadores y fechas del eje), así el PNG es autocontenido y sirve para
// pegar en un informe sin depender de haber visto la pantalla.
interface ExportarGraficoEvolucionParams {
  puntos: PuntoSerieEvolucion[];
  indicadores: IndicadorEvolucionConfig[];
  tipo: TipoGraficoEvolucion;
  periodoLabel: string;
  nombreArchivo: string;
}

const ANCHO = 1200;
const ALTO = 700;
const PAD_X = 50;
const COLOR_TITULO = "#0f172a";
const COLOR_SUBTITULO = "#64748b";
const COLOR_GRILLA = "#e2e8f0";
const COLOR_EJE_TEXTO = "#94a3b8";

function calcularRango(
  puntos: PuntoSerieEvolucion[],
  indicador: IndicadorEvolucionConfig,
) {
  const valores = puntos
    .map((p) => p.valores[indicador.id])
    .filter((v): v is number => v != null);
  const min = valores.length ? Math.min(...valores) : 0;
  const max = valores.length ? Math.max(...valores) : 1;
  return { min, max: max === min ? min + 1 : max };
}

export function exportarGraficoEvolucionPng({
  puntos,
  indicadores,
  tipo,
  periodoLabel,
  nombreArchivo,
}: ExportarGraficoEvolucionParams): void {
  const canvas = document.createElement("canvas");
  canvas.width = ANCHO;
  canvas.height = ALTO;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ANCHO, ALTO);

  ctx.fillStyle = COLOR_TITULO;
  ctx.font = "bold 22px Arial, sans-serif";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Evolución de indicadores", PAD_X, 40);

  const tipoLabel = tipo === "linea" ? "Línea" : "Barras";
  const fechaGeneracion = new Date().toLocaleDateString("es-AR");
  ctx.fillStyle = COLOR_SUBTITULO;
  ctx.font = "14px Arial, sans-serif";
  ctx.fillText(
    `Período: ${periodoLabel} · Gráfico de ${tipoLabel.toLowerCase()} · Generado el ${fechaGeneracion}`,
    PAD_X,
    64,
  );

  // Leyenda: color + nombre + rango real de cada indicador (el eje Y del
  // gráfico está normalizado por indicador, así que el rango acá es la
  // única referencia numérica de qué representa cada línea/barra).
  let legendX = PAD_X;
  let legendY = 92;
  const legendLineHeight = 24;
  ctx.font = "13px Arial, sans-serif";
  const rangos = new Map(
    indicadores.map((i) => [i.id, calcularRango(puntos, i)]),
  );

  for (const indicador of indicadores) {
    const rango = rangos.get(indicador.id)!;
    const texto = `${indicador.label} (${rango.min.toFixed(2)}–${rango.max.toFixed(2)} ${indicador.unidad})`;
    const anchoTexto = ctx.measureText(texto).width;
    const anchoItem = 18 + anchoTexto + 24;

    if (legendX + anchoItem > ANCHO - PAD_X) {
      legendX = PAD_X;
      legendY += legendLineHeight;
    }

    ctx.fillStyle = indicador.color;
    ctx.fillRect(legendX, legendY - 10, 12, 12);
    ctx.fillStyle = COLOR_TITULO;
    ctx.fillText(texto, legendX + 18, legendY);

    legendX += anchoItem;
  }

  const plotTop = legendY + 30;
  const plotBottom = ALTO - 50;
  const plotLeft = PAD_X;
  const plotRight = ANCHO - PAD_X;
  const plotHeight = plotBottom - plotTop;
  const plotWidth = plotRight - plotLeft;

  ctx.fillStyle = COLOR_SUBTITULO;
  ctx.font = "italic 11px Arial, sans-serif";
  ctx.fillText(
    "Escala relativa por indicador — ver rango real en la leyenda",
    plotLeft,
    plotTop - 8,
  );

  ctx.strokeStyle = COLOR_GRILLA;
  ctx.lineWidth = 1;
  for (const frac of [0, 0.5, 1]) {
    const y = plotTop + frac * plotHeight;
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();
  }

  const n = puntos.length;
  const xDe = (i: number) =>
    n <= 1 ? plotLeft + plotWidth / 2 : plotLeft + (i / (n - 1)) * plotWidth;
  const yDe = (indicadorId: IndicadorEvolucionConfig["id"], valor: number) => {
    const rango = rangos.get(indicadorId)!;
    return (
      plotBottom - ((valor - rango.min) / (rango.max - rango.min)) * plotHeight
    );
  };

  if (tipo === "barras") {
    const anchoGrupo = n > 0 ? plotWidth / n : plotWidth;
    const anchoBarra =
      indicadores.length > 0 ? (anchoGrupo * 0.6) / indicadores.length : 0;
    indicadores.forEach((indicador, indiceIndicador) => {
      ctx.fillStyle = indicador.color;
      ctx.globalAlpha = 0.85;
      puntos.forEach((punto, i) => {
        const valor = punto.valores[indicador.id];
        if (valor == null) return;
        const x =
          plotLeft +
          i * anchoGrupo +
          (anchoGrupo - indicadores.length * anchoBarra) / 2 +
          indiceIndicador * anchoBarra;
        const y = yDe(indicador.id, valor);
        ctx.fillRect(
          x,
          y,
          Math.max(anchoBarra - 2, 1),
          Math.max(plotBottom - y, 0),
        );
      });
      ctx.globalAlpha = 1;
    });
  } else {
    for (const indicador of indicadores) {
      const puntosValidos = puntos
        .map((p, i) => ({ i, valor: p.valores[indicador.id] }))
        .filter((p): p is { i: number; valor: number } => p.valor != null);
      if (puntosValidos.length === 0) continue;

      ctx.strokeStyle = indicador.color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      puntosValidos.forEach(({ i, valor }, idx) => {
        const x = xDe(i);
        const y = yDe(indicador.id, valor);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.fillStyle = indicador.color;
      for (const { i, valor } of puntosValidos) {
        ctx.beginPath();
        ctx.arc(xDe(i), yDe(indicador.id, valor), 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.fillStyle = COLOR_EJE_TEXTO;
  ctx.font = "11px Arial, sans-serif";
  ctx.textAlign = "center";
  const paso = Math.ceil(n / 12) || 1;
  puntos.forEach((punto, i) => {
    if (i % paso !== 0) return;
    ctx.fillText(punto.etiqueta, xDe(i), plotBottom + 22);
  });
  ctx.textAlign = "left";

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}
