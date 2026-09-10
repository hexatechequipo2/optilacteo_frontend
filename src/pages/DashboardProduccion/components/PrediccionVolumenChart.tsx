import { useState } from "react";
import type { PrediccionVolumenData } from "../../../types/prediccionVolumen.types";

interface PrediccionVolumenChartProps {
  data: PrediccionVolumenData;
  soloPrediccion: boolean;
}

const COLOR_GRILLA = "#e2e8f0";
const COLOR_EJE_TEXTO = "#94a3b8";
const COLOR_HISTORICO = "#94a3b8";
const COLOR_PREDICCION = "#2563eb";
const COLOR_BANDA = "#bfdbfe";

function formatearFecha(fecha: string): string {
  const [, mes, dia] = fecha.split("-");
  return `${dia}/${mes}`;
}

// HU-51 (AC1, AC2, AC4): gráfico de línea propio en SVG (sin librería, mismo
// criterio que el resto del proyecto — ver LotesProcesadosChart.tsx y
// EvolucionIndicadoresChart.tsx de HU-39). Combina histórico reciente
// (línea sólida gris) y predicción de los próximos 7 días (línea punteada
// azul + banda de confianza sombreada), separados por una marca "HOY".
export function PrediccionVolumenChart({ data, soloPrediccion }: PrediccionVolumenChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const historico = soloPrediccion ? [] : data.historico;
  const nHistorico = historico.length;
  const nPrediccion = data.prediccion.length;
  const n = nHistorico + nPrediccion;

  const valores = [
    ...historico.map((p) => p.litros),
    ...data.prediccion.flatMap((p) => [p.minimo, p.maximo]),
  ];
  const minValor = Math.min(...valores);
  const maxValor = Math.max(...valores);
  const paddingValor = (maxValor - minValor) * 0.1 || 1000;
  const escalaMin = minValor - paddingValor;
  const escalaMax = maxValor + paddingValor;

  const xDe = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);
  const yDe = (valor: number) => 100 - ((valor - escalaMin) / (escalaMax - escalaMin)) * 100;

  const puntosHistorico = historico.map((p, i) => ({ x: xDe(i), y: yDe(p.litros), ...p }));
  const puntosPrediccion = data.prediccion.map((p, i) => ({
    x: xDe(nHistorico + i),
    y: yDe(p.esperado),
    yMin: yDe(p.minimo),
    yMax: yDe(p.maximo),
    ...p,
  }));

  const bandaPoints =
    puntosPrediccion.length > 0
      ? [
          ...puntosPrediccion.map((p) => `${p.x},${p.yMax}`),
          ...[...puntosPrediccion].reverse().map((p) => `${p.x},${p.yMin}`),
        ].join(" ")
      : "";

  const xHoy = nHistorico > 0 ? (xDe(nHistorico - 1) + xDe(nHistorico)) / 2 : 0;

  const ticks = [0, 1, 2, 3].map((i) => escalaMin + ((escalaMax - escalaMin) * i) / 3);

  const todosLosPuntos = [
    ...puntosHistorico.map((p) => ({ x: p.x, fecha: p.fecha, etiqueta: `${p.litros.toLocaleString("es-AR")} L` })),
    ...puntosPrediccion.map((p) => ({
      x: p.x,
      fecha: p.fecha,
      etiqueta: `${p.esperado.toLocaleString("es-AR")} L (${p.minimo.toLocaleString("es-AR")}–${p.maximo.toLocaleString("es-AR")})`,
    })),
  ];
  const hovered = hoverIndex != null ? todosLosPuntos[hoverIndex] : null;

  return (
    <div className="flex items-start gap-3">
      <div
        className="flex h-64 flex-col justify-between py-1 text-right text-[10px] text-slate-400 dark:text-slate-500"
        style={{ color: COLOR_EJE_TEXTO }}
      >
        {ticks
          .slice()
          .reverse()
          .map((tick, i) => (
            <span key={i}>{Math.round(tick).toLocaleString("es-AR")}</span>
          ))}
      </div>

      <div className="relative h-64 w-full">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="block h-full w-full overflow-visible"
          style={{ background: "#ffffff" }}
        >
          {ticks.map((_, i) => (
            <line
              key={i}
              x1="0"
              y1={(i * 100) / 3}
              x2="100"
              y2={(i * 100) / 3}
              stroke={COLOR_GRILLA}
              strokeWidth="0.5"
              strokeDasharray="2,2"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {!soloPrediccion && nHistorico > 0 && (
            <line
              x1={xHoy}
              y1="0"
              x2={xHoy}
              y2="100"
              stroke={COLOR_EJE_TEXTO}
              strokeWidth="0.5"
              strokeDasharray="1,1"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {bandaPoints && <polygon points={bandaPoints} fill={COLOR_BANDA} opacity={0.6} />}

          {puntosHistorico.length > 0 && (
            <polyline
              points={puntosHistorico.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={COLOR_HISTORICO}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {puntosPrediccion.length > 0 && (
            <polyline
              points={puntosPrediccion.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={COLOR_PREDICCION}
              strokeWidth="2"
              strokeDasharray="4,3"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}

          {todosLosPuntos.map((_, i) => (
            <rect
              key={i}
              x={i * (100 / n)}
              y="0"
              width={100 / n}
              height="100"
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              className="cursor-pointer"
            />
          ))}
        </svg>

        {puntosHistorico.map((p, i) => (
          <div
            key={`h-${p.fecha}`}
            className="pointer-events-none absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: hoverIndex === i ? 8 : 5,
              height: hoverIndex === i ? 8 : 5,
              backgroundColor: COLOR_HISTORICO,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
        {puntosPrediccion.map((p, i) => (
          <div
            key={`p-${p.fecha}`}
            className="pointer-events-none absolute rounded-full border-2 border-white"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: hoverIndex === nHistorico + i ? 8 : 5,
              height: hoverIndex === nHistorico + i ? 8 : 5,
              backgroundColor: COLOR_PREDICCION,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}

        {!soloPrediccion && nHistorico > 0 && (
          // Se ubica arriba del todo del área de ploteo (top negativo, no
          // top:0) para que nunca se superponga con el tooltip de hover,
          // que también ancla en top:0 cuando el punto encima es justo el
          // primero de la predicción (el más cercano a "HOY").
          <div
            className="pointer-events-none absolute -translate-x-1/2 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium text-white"
            style={{ left: `${xHoy}%`, top: "-22px" }}
          >
            HOY
          </div>
        )}

        {hovered && (
          <div
            className="pointer-events-none absolute z-10 w-max -translate-y-2 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
            style={{
              left: `${hovered.x}%`,
              top: 0,
              transform: `translateX(${hovered.x > 70 ? "-100%" : "0"})`,
            }}
          >
            <div className="font-semibold">{formatearFecha(hovered.fecha)}</div>
            <div>{hovered.etiqueta}</div>
          </div>
        )}
      </div>
    </div>
  );
}
