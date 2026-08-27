import { useEffect, useState } from "react";
import { Check, WifiOff } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import type { AlertaSensorDesconectadoConCierre } from "../../../types/alertaCierre.types";
import { NivelAlerta } from "../../../types/notificacion.types";
import { ESTADO_ALERTA_META, NIVEL_ALERTA_META } from "../constants/alertas.constants";

interface AlertaSensorDesconectadoCardProps {
  alerta: AlertaSensorDesconectadoConCierre;
  onMarcarLeida: (id: number) => void;
  onSeleccionar: (alerta: AlertaSensorDesconectadoConCierre) => void;
}

function formatearHora(timestamp: string): string {
  return new Date(timestamp).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Mismo criterio que formatearHace en EstadoDiagnosticoTab.tsx (Sensores) —
// se duplica en vez de extraerse a un util compartido porque son las dos
// únicas pantallas que lo necesitan y difieren en el tick (acá cada 30s
// alcanza, no hace falta el segundo a segundo de la grilla en vivo).
function formatearTranscurrido(timestamp: string | null, ahora: number): string {
  if (!timestamp) return "sin lectura registrada";
  const diffSeg = Math.floor((ahora - new Date(timestamp).getTime()) / 1000);
  if (diffSeg < 60) return `hace ${diffSeg} s`;
  if (diffSeg < 3600) return `hace ${Math.floor(diffSeg / 60)} min`;
  const horas = Math.floor(diffSeg / 3600);
  const minRestantes = Math.floor((diffSeg % 3600) / 60);
  return `hace ${horas} h ${minRestantes} min`;
}

// HU-31 AC2/AC3: alerta crítica de sensor desconectado — nombre del sensor,
// última lectura y tiempo transcurrido. Hermana de AlertaCard.tsx (HU-25),
// pero con la forma de datos propia de este tipo (sensorNombre/ultimaLectura/
// minutosSinDatos en vez de parametro/valor/umbralMin/umbralMax) — ver
// AlertasPage.tsx, que decide cuál de las dos renderizar según `alerta.tipo`.
export function AlertaSensorDesconectadoCard({
  alerta,
  onMarcarLeida,
  onSeleccionar,
}: AlertaSensorDesconectadoCardProps) {
  const { data } = alerta;
  const meta = NIVEL_ALERTA_META[alerta.nivelAlerta];
  const NivelIcon = meta.icon;
  const estadoMeta = ESTADO_ALERTA_META[alerta.estado];
  const EstadoIcon = estadoMeta.icon;

  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setAhora(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSeleccionar(alerta)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSeleccionar(alerta);
        }
      }}
      className={`flex cursor-pointer flex-col gap-3 rounded-xl border-l-4 border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-5 ${
        alerta.nivelAlerta === NivelAlerta.CRITICA ? "border-l-red-500" : "border-l-amber-500"
      } ${alerta.leida ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <WifiOff className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Sensor desconectado — {data.sensorNombre}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{alerta.mensaje}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={meta.badgeVariant}>
            <NivelIcon className="h-3 w-3" />
            {meta.label}
          </Badge>
          <Badge variant={estadoMeta.badgeVariant}>
            <EstadoIcon className="h-3 w-3" />
            {estadoMeta.label}
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
          <p className="text-xs text-slate-400 dark:text-slate-500">Última lectura</p>
          <span className="text-slate-700 dark:text-slate-300">
            {formatearTranscurrido(data.ultimaLectura, ahora)}
          </span>
        </div>
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500">Tiempo sin datos</p>
          <span className="text-slate-700 dark:text-slate-300">{data.minutosSinDatos} min</span>
        </div>
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500">Hora de la alerta</p>
          <span className="text-slate-700 dark:text-slate-300">{formatearHora(alerta.createdAt)}</span>
        </div>
      </div>

      {!alerta.leida && (
        <div className="flex items-center justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMarcarLeida(alerta.id);
            }}
            onKeyDown={(e) => e.stopPropagation()}
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
