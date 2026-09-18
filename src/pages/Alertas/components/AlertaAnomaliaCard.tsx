import { Check, Sparkles } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import type { AlertaAnomaliaConCierre } from "../../../types/alertaCierre.types";
import { EstadoAlerta } from "../../../types/alertaCierre.types";
import { getNivelConfianza } from "../../../utils/confianza";
import {
  ESTADO_ALERTA_META,
  NIVEL_CONFIANZA_META,
  PARAMETRO_LABEL,
  TIPO_DESVIO_LABEL,
} from "../constants/alertas.constants";

interface AlertaAnomaliaCardProps {
  alerta: AlertaAnomaliaConCierre;
  onMarcarLeida: (id: number) => void;
  onSeleccionar: (alerta: AlertaAnomaliaConCierre) => void;
}

function formatearHora(timestamp: string): string {
  return new Date(timestamp).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// HU-50 criterio 3: card de anomalía detectada por ML — hermana de
// AlertaCard.tsx (HU-25) y AlertaSensorDesconectadoCard.tsx (HU-31), con la
// forma de datos propia de este tipo (parametro/tipoDesvio/confianza/
// modeloVersion). A diferencia de las otras dos, no hay nivelAlerta ni
// borde por severidad: el modelo ML no compara contra un umbral, así que el
// borde izquierdo queda fijo en azul (mismo tono que usa RecomendacionDestinoCard
// para "sugerencia del sistema", HU-49).
export function AlertaAnomaliaCard({ alerta, onMarcarLeida, onSeleccionar }: AlertaAnomaliaCardProps) {
  const { data } = alerta;
  const estadoMeta = ESTADO_ALERTA_META[alerta.estado];
  const EstadoIcon = estadoMeta.icon;
  const esFalsoPositivo = alerta.estado === EstadoAlerta.FALSO_POSITIVO;
  const confianzaMeta = NIVEL_CONFIANZA_META[getNivelConfianza(alerta.confianza)];

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
      className={`flex cursor-pointer flex-col gap-3 rounded-xl border-l-4 border-slate-200 border-l-blue-500 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-5 ${
        alerta.leida ? "opacity-60" : ""
      } ${esFalsoPositivo ? "opacity-50" : ""}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {PARAMETRO_LABEL[data.parametro]}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{alerta.mensaje}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">
            <Sparkles className="h-3 w-3" />
            Anomalía detectada
          </Badge>
          <Badge variant={confianzaMeta.badgeVariant}>{confianzaMeta.label}</Badge>
          <Badge variant={estadoMeta.badgeVariant}>
            <EstadoIcon className="h-3 w-3" />
            {estadoMeta.label}
          </Badge>
          {!esFalsoPositivo && (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                alerta.leida
                  ? "bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-500"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {alerta.leida ? "Leída" : "No leída"}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div>
          <p className="text-xs text-slate-400 dark:text-slate-500">Tipo de desvío</p>
          <span className="text-slate-700 dark:text-slate-300">{TIPO_DESVIO_LABEL[alerta.tipoDesvio]}</span>
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

      {!esFalsoPositivo && !alerta.leida && (
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
