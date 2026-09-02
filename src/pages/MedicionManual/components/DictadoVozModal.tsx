import { AlertTriangle, AudioLines, Mic, Pause, Play, X } from "lucide-react";
import {
  PARAMETRO_LABEL,
  UNIDAD_POR_PARAMETRO,
} from "../../Sensores/constants/parametroSensor";
import { Badge } from "../../../components/ui/Badge";
import type { BadgeVariant } from "../../../components/ui/Badge";
import type {
  EstadoDictadoVoz,
  ParametroCapturadoVoz,
} from "../../../types/dictadoVoz.types";

// HU-55 (Sprint 4): mock visual del modo de dictado por voz para "Medición
// manual". Todavía no hay reconocimiento de voz real ni conexión a backend
// — es solo la interfaz, tal como surge del prototipo (Figura 11). El
// componente recibe todo por props para que conectar el micrófono real
// (Web Speech API) y/o el backend más adelante no requiera tocar este
// archivo, solo a quien lo use.

const NIVEL_BADGE_VARIANT: Record<
  ParametroCapturadoVoz["nivelReconocimiento"],
  BadgeVariant
> = {
  alta: "success",
  media: "warning",
  baja: "danger",
};

const NIVEL_LABEL: Record<
  ParametroCapturadoVoz["nivelReconocimiento"],
  string
> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

interface DictadoVozModalProps {
  isOpen: boolean;
  estado: EstadoDictadoVoz;
  transcripcionEnVivo: string;
  advertenciaRuido?: string;
  parametrosCapturados: ParametroCapturadoVoz[];
  totalParametrosEsperados: number;
  onClose: () => void;
  onPausarOReanudar: () => void;
  onConfirmar: () => void;
}

export function DictadoVozModal({
  isOpen,
  estado,
  transcripcionEnVivo,
  advertenciaRuido,
  parametrosCapturados,
  totalParametrosEsperados,
  onClose,
  onPausarOReanudar,
  onConfirmar,
}: DictadoVozModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Dictando valores"
        className="flex w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
              <Mic className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Dictando valores
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {parametrosCapturados.length} parámetros capturados en esta
                sesión
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col items-center gap-2 py-2">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
              <AudioLines className="h-8 w-8" />
            </span>
            <Badge variant={estado === "escuchando" ? "danger" : "neutral"}>
              {estado === "escuchando" ? "Escuchando" : "Pausado"}
            </Badge>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
              TRANSCRIPCIÓN EN VIVO
            </span>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {transcripcionEnVivo || (
                <span className="text-slate-400 dark:text-slate-500">
                  Decí el parámetro y el valor...
                </span>
              )}
            </div>
          </div>

          {advertenciaRuido && (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{advertenciaRuido}</span>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
                PARÁMETROS CAPTURADOS
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {parametrosCapturados.length} DE {totalParametrosEsperados}
              </span>
            </div>

            {parametrosCapturados.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
                Todavía no se capturó ningún parámetro.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {parametrosCapturados.map((item, index) => (
                  <li
                    key={`${item.parametro}-${index}`}
                    className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {PARAMETRO_LABEL[item.parametro]}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        Escuchado: "{item.escuchado}"
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {item.valor}
                        {UNIDAD_POR_PARAMETRO[item.parametro] ?? ""}
                      </span>
                      <Badge
                        variant={NIVEL_BADGE_VARIANT[item.nivelReconocimiento]}
                      >
                        {NIVEL_LABEL[item.nivelReconocimiento]}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onPausarOReanudar}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {estado === "escuchando" ? (
                <>
                  <Pause className="h-4 w-4" /> Pausar
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Reanudar
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-slate-700 dark:hover:bg-red-500/10"
            >
              <X className="h-4 w-4" /> Cancelar
            </button>
          </div>
          <button
            type="button"
            onClick={onConfirmar}
            disabled={parametrosCapturados.length === 0}
            className="flex items-center justify-center rounded-lg bg-[#3d6fcf] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3460b5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Revisar y confirmar ({parametrosCapturados.length})
          </button>
        </div>
      </div>
    </div>
  );
}
