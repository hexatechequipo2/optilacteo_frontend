import type { PuntoHistoricoLotes } from "../../../types/dashboardProduccion.types";

interface LotesProcesadosChartProps {
  datos: PuntoHistoricoLotes[];
}

// Gráfico de línea sin dependencias externas (no hay librería de charts en
// el proyecto) — SVG con viewBox 0..100 y vector-effect="non-scaling-stroke"
// para que el trazo se mantenga nítido en cualquier ancho de pantalla.
export function LotesProcesadosChart({ datos }: LotesProcesadosChartProps) {
  if (datos.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
        Sin lotes procesados en los últimos 7 días.
      </div>
    );
  }

  const valores = datos.map((d) => d.valor);
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const rango = max - min || 1;

  const puntos = datos.map((d, i) => {
    const x = datos.length === 1 ? 50 : (i / (datos.length - 1)) * 100;
    const y = 100 - ((d.valor - min) / rango) * 100;
    return { x, y, ...d };
  });

  const pathPoints = puntos.map((p) => `${p.x},${p.y}`).join(" ");

  const formatDia = (fecha: string) =>
    new Date(fecha).toLocaleDateString("es-AR", { weekday: "short" });

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="flex h-40 flex-col justify-between py-1 text-right text-[10px] text-slate-400 dark:text-slate-500">
          <span>{max}</span>
          <span>{Math.round((max + min) / 2)}</span>
          <span>{min}</span>
        </div>

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-40 w-full"
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
              vectorEffect="non-scaling-stroke"
              className="text-slate-100 dark:text-slate-800"
              strokeDasharray="2,2"
            />
          ))}

          <polyline
            points={pathPoints}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="text-blue-600 dark:text-blue-400"
          />

          {puntos.map((p) => (
            <circle
              key={p.fecha}
              cx={p.x}
              cy={p.y}
              r="1.5"
              vectorEffect="non-scaling-stroke"
              className="fill-blue-600 dark:fill-blue-400"
            />
          ))}
        </svg>
      </div>

      <div className="mt-1 flex justify-between pl-8 text-[10px] text-slate-400 dark:text-slate-500">
        {datos.map((d) => (
          <span key={d.fecha}>{formatDia(d.fecha)}</span>
        ))}
      </div>
    </div>
  );
}
