import { forwardRef, useState } from "react";
import type { IndicadorEvolucionConfig, PuntoSerieEvolucion, TipoGraficoEvolucion } from "../../../types/indicadorEvolucion.types";

interface EvolucionIndicadoresChartProps {
  puntos: PuntoSerieEvolucion[];
  indicadores: IndicadorEvolucionConfig[];
  tipo: TipoGraficoEvolucion;
}

const COLOR_GRILLA = "#e2e8f0";
const COLOR_EJE_TEXTO = "#94a3b8";

// HU-39 (AC1 y AC3): un solo gráfico compara indicadores con unidades
// distintas entre sí (% de grasa, °C de temperatura, k/mL de células
// somáticas...), así que cada serie se normaliza a su propio rango
// visible (0-100) en vez de compartir un eje Y absoluto — el valor real se
// ve en el tooltip y en la leyenda/chips, no en el eje. El gráfico se
// renderiza siempre con paleta clara (sin dark:) porque también es la
// imagen que se exporta a PNG para informes (AC4).
export const EvolucionIndicadoresChart = forwardRef<SVGSVGElement, EvolucionIndicadoresChartProps>(
  function EvolucionIndicadoresChart({ puntos, indicadores, tipo }, ref) {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);

    const n = puntos.length;
    const rangosPorIndicador = new Map(
      indicadores.map((indicador) => {
        const valores = puntos
          .map((p) => p.valores[indicador.id])
          .filter((v): v is number => v != null);
        const min = valores.length ? Math.min(...valores) : 0;
        const max = valores.length ? Math.max(...valores) : 1;
        return [indicador.id, { min, max: max === min ? min + 1 : max }];
      }),
    );

    const xDe = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);
    const yDe = (indicadorId: IndicadorEvolucionConfig["id"], valor: number) => {
      const r = rangosPorIndicador.get(indicadorId);
      if (!r) return 50;
      return 100 - ((valor - r.min) / (r.max - r.min)) * 100;
    };

    const anchoBarraGrupo = n > 0 ? 100 / n : 100;
    const anchoBarra = indicadores.length > 0 ? (anchoBarraGrupo * 0.6) / indicadores.length : 0;

    const hovered = hoverIndex != null ? puntos[hoverIndex] : null;
    const hoveredX = hoverIndex != null ? xDe(hoverIndex) : null;

    return (
      <div className="relative">
        <svg
          ref={ref}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-72 w-full overflow-visible"
          style={{ background: "#ffffff" }}
        >
          {[0, 50, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke={COLOR_GRILLA}
              strokeWidth="0.5"
              strokeDasharray="2,2"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {indicadores.map((indicador) => {
            if (tipo === "barras") {
              return puntos.map((punto, i) => {
                const valor = punto.valores[indicador.id];
                if (valor == null) return null;
                const alturaY = yDe(indicador.id, valor);
                const indiceIndicador = indicadores.findIndex((ind) => ind.id === indicador.id);
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
              .filter((p): p is { i: number; valor: number } => p.valor != null);

            if (puntosValidos.length === 0) return null;

            const pathPoints = puntosValidos
              .map(({ i, valor }) => `${xDe(i)},${yDe(indicador.id, valor)}`)
              .join(" ");

            return (
              <g key={indicador.id}>
                <polyline
                  points={pathPoints}
                  fill="none"
                  stroke={indicador.color}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
                {puntosValidos.map(({ i, valor }) => (
                  <circle
                    key={i}
                    cx={xDe(i)}
                    cy={yDe(indicador.id, valor)}
                    r={hoverIndex === i ? "1.6" : "1"}
                    fill={indicador.color}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </g>
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
              stroke={COLOR_EJE_TEXTO}
              strokeWidth="0.5"
              strokeDasharray="1,1"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

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

        <div className="mt-1 flex justify-between text-[10px]" style={{ color: COLOR_EJE_TEXTO }}>
          {puntos.map((p, i) => (
            <span key={p.timestamp} className={i % Math.ceil(n / 12 || 1) === 0 ? "" : "opacity-0"}>
              {p.etiqueta}
            </span>
          ))}
        </div>
      </div>
    );
  },
);
