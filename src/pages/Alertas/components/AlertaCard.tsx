import {
  Activity,
  Check,
  Droplet,
  Gauge,
  Grid2x2,
  Radar,
  Target,
  Thermometer,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { ValorConUnidad } from "../../../components/ValorConUnidad";
import { Parametro } from "../../../types/configParametro.types";
import type { AlertaNotificacion } from "../../../types/notificacion.types";
import { NivelAlerta } from "../../../types/notificacion.types";
import { NIVEL_ALERTA_META, PARAMETRO_LABEL, UNIDAD_POR_PARAMETRO } from "../constants/alertas.constants";

// Mismo criterio visual que PARAMETRO_ICON en EstadoDiagnosticoTab.tsx
// (Sensores), para que un parámetro se identifique con el mismo ícono en
// las dos pantallas.
const PARAMETRO_ICON: Record<Parametro, LucideIcon> = {
  [Parametro.PH]: Target,
  [Parametro.TEMPERATURA]: Thermometer,
  [Parametro.DENSIDAD]: Grid2x2,
  [Parametro.GRASA]: Droplet,
  [Parametro.PROTEINA]: Gauge,
  [Parametro.ACIDEZ]: Activity,
  [Parametro.CONDUCTIVIDAD]: Radar,
};

interface AlertaCardProps {
  alerta: AlertaNotificacion;
  onMarcarLeida: (id: number) => void;
}

function formatearHora(timestamp: string): string {
  return new Date(timestamp).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// AC3: cada card muestra parámetro afectado, valor registrado, umbral
// configurado y lote asociado, además de la hora y el nivel.
export function AlertaCard({ alerta, onMarcarLeida }: AlertaCardProps) {
  const { data } = alerta;
  const meta = NIVEL_ALERTA_META[alerta.nivelAlerta];
  const NivelIcon = meta.icon;
  const ParametroIcon = PARAMETRO_ICON[data.parametro];
  const unidad = UNIDAD_POR_PARAMETRO[data.parametro];

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border-l-4 border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5 ${
        alerta.nivelAlerta === NivelAlerta.CRITICA
          ? "border-l-red-500"
          : alerta.nivelAlerta === NivelAlerta.ADVERTENCIA
            ? "border-l-amber-500"
            : "border-l-blue-500"
      } ${alerta.leida ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <ParametroIcon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {PARAMETRO_LABEL[data.parametro]}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{alerta.mensaje}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={meta.badgeVariant}>
            <NivelIcon className="h-3 w-3" />
            {meta.label}
          </Badge>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              alerta.leida
                ? "bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {alerta.leida ? "Leída" : "No leída"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500">Valor registrado</p>
          <ValorConUnidad valor={data.valor} unidad={unidad} />
        </div>
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500">Umbral configurado</p>
          <span className="text-slate-700 dark:text-slate-300">
            {data.umbralMin}–{data.umbralMax}
            {unidad ? ` ${unidad}` : ""}
          </span>
        </div>
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500">Lote asociado</p>
          <span className="text-slate-700 dark:text-slate-300">{data.loteCodigo}</span>
        </div>
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500">Hora</p>
          <span className="text-slate-700 dark:text-slate-300">{formatearHora(alerta.createdAt)}</span>
        </div>
      </div>

      {!alerta.leida && (
        <div className="flex items-center justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onMarcarLeida(alerta.id)}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <Check className="h-3.5 w-3.5" />
            Marcar como leída
          </button>
        </div>
      )}
    </div>
  );
}
