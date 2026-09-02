import { RotateCcw, Sparkles } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import type { BadgeVariant } from "../../../components/ui/Badge";
import type { DestinoLote } from "../../../types/lote.types";
import type {
  NivelConfianzaRecomendacion,
  RecomendacionDestinoIA,
} from "../../../types/recomendacionDestino.types";

// HU-49 (Sprint 4, mock visual): tarjeta de recomendación de destino
// productivo por ML dentro de "Editar lote" (Figura 7). Sin conexión a
// backend todavía — `recomendacion` llega en null desde LoteFormModal
// (no hay historial real para predecir), así que hoy solo se ve el estado
// "sin recomendación disponible". El resto (recomendación con confianza +
// aceptar/elegir otro + justificación de divergencia) queda implementado y
// listo para cuando exista el modelo real.

const JUSTIFICACION_MIN_LENGTH = 30;

const NIVEL_BADGE_VARIANT: Record<NivelConfianzaRecomendacion, BadgeVariant> = {
  alta: "success",
  media: "warning",
  baja: "danger",
};

const NIVEL_LABEL: Record<NivelConfianzaRecomendacion, string> = {
  alta: "Confianza alta",
  media: "Confianza media",
  baja: "Confianza baja",
};

interface RecomendacionDestinoCardProps {
  recomendacion: RecomendacionDestinoIA | null;
  destinoLabel: Record<DestinoLote, string>;
  destinoSeleccionado: DestinoLote | "";
  onAceptarRecomendacion: () => void;
  justificacion: string;
  onJustificacionChange: (value: string) => void;
  errorJustificacion?: string;
}

export function RecomendacionDestinoCard({
  recomendacion,
  destinoLabel,
  destinoSeleccionado,
  onAceptarRecomendacion,
  justificacion,
  onJustificacionChange,
  errorJustificacion,
}: RecomendacionDestinoCardProps) {
  const header = (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
        <Sparkles className="h-3.5 w-3.5" /> SUGERENCIA DEL SISTEMA
      </span>
      <span className="flex items-center gap-1 text-xs font-medium text-slate-400 dark:text-slate-500">
        <RotateCcw className="h-3 w-3" /> Recalcular
      </span>
    </div>
  );

  if (!recomendacion) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
        {header}
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Sin recomendación disponible
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No hay historial suficiente de este proveedor para generar una
          predicción confiable. Elegí el destino manualmente más abajo.
        </p>
      </div>
    );
  }

  const divergeDelSugerido =
    destinoSeleccionado !== "" &&
    destinoSeleccionado !== recomendacion.destinoSugerido;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      {header}

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Destino recomendado por el sistema:{" "}
            {destinoLabel[recomendacion.destinoSugerido]}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Basado en {recomendacion.lotesComparables} lotes comparables de este
            proveedor
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-lg font-bold text-slate-900 dark:text-white">
            {recomendacion.confianza}%
          </span>
          <Badge variant={NIVEL_BADGE_VARIANT[recomendacion.nivelConfianza]}>
            {NIVEL_LABEL[recomendacion.nivelConfianza]}
          </Badge>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onAceptarRecomendacion}
          className="flex flex-1 items-center justify-center rounded-lg bg-[#3d6fcf] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3460b5]"
        >
          Aceptar recomendación
        </button>
        <span className="flex flex-1 items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Elegí otro destino más abajo
        </span>
      </div>

      {divergeDelSugerido && (
        <div className="flex flex-col gap-2 rounded-md bg-amber-50 p-3 dark:bg-amber-500/10">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Elegiste <strong>{destinoLabel[destinoSeleccionado]}</strong> en
            lugar del destino recomendado{" "}
            <strong>{destinoLabel[recomendacion.destinoSugerido]}</strong>.
          </p>
          <label
            htmlFor="justificacion-divergencia"
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Justificación de la divergencia *
          </label>
          <textarea
            id="justificacion-divergencia"
            rows={3}
            placeholder="Explicá por qué este lote se deriva a un destino distinto al recomendado..."
            value={justificacion}
            onChange={(e) => onJustificacionChange(e.target.value)}
            className={`w-full rounded-md border px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white ${
              errorJustificacion
                ? "border-red-500"
                : "border-slate-300 dark:border-slate-700"
            }`}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {justificacion.length}/{JUSTIFICACION_MIN_LENGTH} mínimo{" "}
              {JUSTIFICACION_MIN_LENGTH} caracteres
            </span>
            {errorJustificacion && (
              <span className="text-xs text-red-600 dark:text-red-400">
                {errorJustificacion}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Esta decisión queda registrada para auditoría con tu usuario y la
            fecha/hora del cambio.
          </p>
        </div>
      )}
    </div>
  );
}

export { JUSTIFICACION_MIN_LENGTH };
