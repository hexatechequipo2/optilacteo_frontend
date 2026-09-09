import { useState } from "react";
import type {
  IndicadorEvolucionConfig,
  PuntoSerieEvolucion,
  TipoGraficoEvolucion,
} from "../../../types/indicadorEvolucion.types";
import { calcularRangoIndicador } from "../../../utils/indicadorEvolucionRango";

interface EvolucionIndicadoresChartProps {
  puntos: PuntoSerieEvolucion[];
  indicadores: IndicadorEvolucionConfig[];
  tipo: TipoGraficoEvolucion;
}

// HU-39 (AC1 y AC3): un solo gráfico compara indicadores con unidades
// distintas entre sí (% de grasa, °C de temperatura, k/mL de células
// somáticas...), así que cada serie se normaliza a su propio rango
// visible (0-100) en vez de compartir un eje Y absoluto — no hay eje Y
// numérico porque esos números no representarían nada real; el valor real
// se ve en el tooltip y en la leyenda de abajo, con el mismo rango que
// exportarGraficoEvolucionPng.ts calcula para el PNG (calcularRangoIndicador
// compartido, para que pantalla y PNG nunca muestren rangos distintos).
export function EvolucionIndicadoresChart({
  puntos,
  indicadores,
  tipo,
}: EvolucionIndicadoresChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const n = puntos.length;
  const rangosPorIndicador = new Map(
    indicadores.map((indicador) => [
      indicador.id,
      calcularRangoIndicador(puntos, indicador),
    ]),
  );

  const xDe = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);
  const yDe = (indicadorId: IndicadorEvolucionConfig["id"], valor: number) => {
    const r = rangosPorIndicador.get(indicadorId);
    if (!r) return 50;
    return 100 - ((valor - r.min) / (r.max - r.min)) * 100;
  };

  const anchoBarraGrupo = n > 0 ? 100 / n : 100;
  const anchoBarra =
    indicadores.length > 0 ? (anchoBarraGrupo * 0.6) / indicadores.length : 0;

  const hovered = hoverIndex != null ? puntos[hoverIndex] : null;
  const hoveredX = hoverIndex != null ? xDe(hoverIndex) : null;

  return (
    // El contenedor con position:relative que ancla los marcadores/tooltip
    // (posicionados con top/left en %) tiene que medir EXACTAMENTE lo
    // mismo que el <svg> (h-72). Si la fila de etiquetas del eje X viviera
    // adentro de este mismo div, sumaría su alto al cálculo del % y
    // corriría los marcadores hacia abajo respecto de la línea/barras.
    <div>
      {/* Leyenda con el rango real por indicador — mismo cálculo
          (calcularRangoIndicador) y mismo texto que la leyenda del PNG
          exportado (ver exportarGraficoEvolucionPng.ts), para que pantalla
          y PNG nunca se contradigan sobre qué representa cada línea/barra. */}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {indicadores.map((indicador) => {
          const rango = rangosPorIndicador.get(indicador.id)!;
          return (
            <span
              key={indicador.id}
              className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"
            >
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: indicador.color }}
              />
              {indicador.label} ({rango.min.toFixed(2)}–{rango.max.toFixed(2)} {indicador.unidad})
            </span>
          );
        })}
      </div>
      <p className="mb-2 text-[11px] italic text-slate-400 dark:text-slate-500">
        Escala relativa por indicador — ver rango real en la leyenda
      </p>

      <div className="relative h-72 w-full">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="block h-full w-full overflow-visible rounded-md bg-white dark:bg-slate-900"
        >
          {[0, 50, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="currentColor"
              strokeWidth="0.5"
              strokeDasharray="2,2"
              vectorEffect="non-scaling-stroke"
              className="text-slate-100 dark:text-slate-800"
            />
          ))}

          {indicadores.map((indicador) => {
            if (tipo === "barras") {
              return puntos.map((punto, i) => {
                const valor = punto.valores[indicador.id];
                if (valor == null) return null;
                const alturaY = yDe(indicador.id, valor);
                const indiceIndicador = indicadores.findIndex(
                  (ind) => ind.id === indicador.id,
                );
                const x =
                  i * anchoBarraGrupo +
                  (anchoBarraGrupo - indicadores.length * anchoBarra) / 2 +
                  indiceIndicador * anchoBarra;
                return (
                  <rect
                    key={`${indicador.id}-${punto.timestamp}`}
                    x={x}
                    y={alturaY}
                    width={Math.max(anchoBarra - 0.4, 0.2)}
                    height={Math.max(100 - alturaY, 0)}
                    fill={indicador.color}
                    opacity={0.85}
                  />
                );
              });
            }

            const puntosValidos = puntos
              .map((p, i) => ({ i, valor: p.valores[indicador.id] }))
              .filter(
                (p): p is { i: number; valor: number } => p.valor != null,
              );

            if (puntosValidos.length === 0) return null;

            const pathPoints = puntosValidos
              .map(({ i, valor }) => `${xDe(i)},${yDe(indicador.id, valor)}`)
              .join(" ");

            return (
              <polyline
                key={indicador.id}
                points={pathPoints}
                fill="none"
                stroke={indicador.color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {puntos.map((_, i) => (
            <rect
              key={i}
              x={i * anchoBarraGrupo}
              y="0"
              width={anchoBarraGrupo}
              height="100"
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              className="cursor-pointer"
            />
          ))}

          {hoveredX != null && (
            <line
              x1={hoveredX}
              y1="0"
              x2={hoveredX}
              y2="100"
              stroke="currentColor"
              strokeWidth="0.5"
              strokeDasharray="1,1"
              vectorEffect="non-scaling-stroke"
              className="text-slate-300 dark:text-slate-600"
            />
          )}
        </svg>

        {/* Marcadores de línea como overlay HTML (no SVG): el viewBox usa
            preserveAspectRatio="none" para que el gráfico ocupe todo el
            ancho disponible, y eso estira un <circle> en una elipse cuando
            el aspect ratio no es 1:1. Un <div> con border-radius fijo en
            píxeles no sufre esa distorsión. */}
        {tipo === "linea" &&
          indicadores.map((indicador) =>
            puntos.map((punto, i) => {
              const valor = punto.valores[indicador.id];
              if (valor == null) return null;
              const activo = hoverIndex === i;
              return (
                <div
                  key={`${indicador.id}-${punto.timestamp}`}
                  className="pointer-events-none absolute rounded-full"
                  style={{
                    left: `${xDe(i)}%`,
                    top: `${yDe(indicador.id, valor)}%`,
                    width: activo ? 8 : 5,
                    height: activo ? 8 : 5,
                    backgroundColor: indicador.color,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              );
            }),
          )}

        {hovered && (
          <div
            className="pointer-events-none absolute z-10 w-max max-w-[220px] -translate-y-2 rounded-md bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
            style={{
              left: `${hoveredX}%`,
              top: 0,
              transform: `translateX(${(hoveredX ?? 0) > 70 ? "-100%" : "0"})`,
            }}
          >
            <div className="mb-1 font-semibold">{hovered.etiqueta}</div>
            {indicadores.map((indicador) => {
              const valor = hovered.valores[indicador.id];
              if (valor == null) return null;
              return (
                <div key={indicador.id} className="flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: indicador.color }}
                  />
                  <span>
                    {indicador.label}: {valor} {indicador.unidad}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-1 flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
        {puntos.map((p, i) => (
          <span
            key={p.timestamp}
            className={i % Math.ceil(n / 12 || 1) === 0 ? "" : "opacity-0"}
          >
            {p.etiqueta}
          </span>
        ))}
      </div>
    </div>
  );
}
