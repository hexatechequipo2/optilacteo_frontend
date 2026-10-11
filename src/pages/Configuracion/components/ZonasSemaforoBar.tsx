import type { UmbralesConfig } from "../../../types/configParametro.types";
import { segmentosZonas } from "../../../utils/umbralesConfig";
import type { ZonaSemaforo } from "../../../utils/umbralesConfig";

interface ZonasSemaforoBarProps {
  // undefined: los inputs todavía no forman una cadena válida.
  umbrales: UmbralesConfig | undefined;
  rangoFisico: { min: number; max: number };
}

// Mismos colores que las tarjetas de MonitoreoSemaforoTab.
const COLOR_ZONA: Record<ZonaSemaforo, string> = {
  verde: "bg-green-500 dark:bg-green-500/80",
  amarillo: "bg-amber-400 dark:bg-amber-400/80",
  rojo: "bg-red-500 dark:bg-red-500/80",
};

// HU-40: referencia visual de qué valores quedan en verde, amarillo y rojo
// con los umbrales que se están editando. Es solo una vista previa: el
// estado de cada lectura lo calcula el backend.
export function ZonasSemaforoBar({ umbrales, rangoFisico }: ZonasSemaforoBarProps) {
  if (!umbrales) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Completá los 4 valores para ver las zonas del semáforo.
        </p>
      </div>
    );
  }

  const { umbralAlertaMin, umbralMin, umbralMax, umbralAlertaMax } = umbrales;
  const tramosAmarillos = [
    umbralAlertaMin < umbralMin ? `${umbralAlertaMin} a ${umbralMin}` : null,
    umbralMax < umbralAlertaMax ? `${umbralMax} a ${umbralAlertaMax}` : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full"
        role="img"
        aria-label={`Verde de ${umbralMin} a ${umbralMax}, rojo por debajo de ${umbralAlertaMin} o por encima de ${umbralAlertaMax}`}
      >
        {segmentosZonas(umbrales, rangoFisico).map((s, i) => (
          <div key={i} className={COLOR_ZONA[s.zona]} style={{ width: `${s.ancho}%` }} />
        ))}
      </div>

      <ul className="flex flex-col gap-0.5 text-xs text-slate-600 dark:text-slate-400">
        <li className="flex items-center gap-1.5">
          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
          Normal: {umbralMin} a {umbralMax}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-amber-400" />
          En límite: {tramosAmarillos.length > 0 ? tramosAmarillos.join(" · ") : "sin banda de alerta"}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-red-500" />
          Fuera de rango: &lt; {umbralAlertaMin} · &gt; {umbralAlertaMax}
        </li>
      </ul>
    </div>
  );
}
