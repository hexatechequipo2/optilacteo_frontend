import { AlertTriangle, CheckCircle2, Mic, RotateCcw, Volume2 } from "lucide-react";
import {
  MAX_INTENTOS_CONFIRMACION,
  type EstadoConfirmacionVerbal,
  type MotivoRevisionManual,
} from "../../../hooks/useConfirmacionVerbal";

// HU-56: estado de la confirmación verbal dentro de la revisión del
// dictado. Solo presenta: la lógica vive en useConfirmacionVerbal.

const DETALLE_REVISION_MANUAL: Record<MotivoRevisionManual, string> = {
  intentos_agotados: `No se entendió la respuesta después de ${MAX_INTENTOS_CONFIRMACION} intentos. Revisá los valores y confirmá con el botón.`,
  microfono_denegado:
    "No hay acceso al micrófono. Revisá los valores y confirmá con el botón.",
  sin_sintesis:
    "Este navegador no puede leer los valores en voz alta. Revisá los valores y confirmá con el botón.",
  sin_reconocimiento:
    "Este navegador no reconoce comandos de voz. Revisá los valores y confirmá con el botón.",
};

interface ConfirmacionVerbalPanelProps {
  estado: EstadoConfirmacionVerbal;
  puedeLeerDeNuevo: boolean;
  onLeerDeNuevo: () => void;
}

export function ConfirmacionVerbalPanel({
  estado,
  puedeLeerDeNuevo,
  onLeerDeNuevo,
}: ConfirmacionVerbalPanelProps) {
  if (estado.fase === "inactiva") return null;

  const botonLeerDeNuevo = (
    <button
      type="button"
      onClick={onLeerDeNuevo}
      disabled={!puedeLeerDeNuevo}
      className="flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <RotateCcw className="h-3.5 w-3.5" /> Leer de nuevo
    </button>
  );

  let icono = <Volume2 className="mt-0.5 h-4 w-4 shrink-0" />;
  let tono =
    "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400";
  let titulo: string;
  let detalle: string | null = null;
  let conLeerDeNuevo = false;

  switch (estado.fase) {
    case "leyendo":
      titulo = "Leyendo los valores en voz alta...";
      break;
    case "escuchando":
      icono = <Mic className="mt-0.5 h-4 w-4 shrink-0" />;
      titulo = 'Escuchando: decí "confirmar" o "cancelar"';
      detalle = `Intento ${estado.intento} de ${MAX_INTENTOS_CONFIRMACION}`;
      break;
    case "confirmada":
      icono = <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />;
      tono =
        "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400";
      titulo = "Confirmado por voz";
      break;
    case "detenida":
      icono = <Mic className="mt-0.5 h-4 w-4 shrink-0" />;
      tono =
        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
      titulo = "Confirmación por voz cancelada. No se guardó nada.";
      conLeerDeNuevo = true;
      break;
    case "interrumpida":
      icono = <Mic className="mt-0.5 h-4 w-4 shrink-0" />;
      tono =
        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
      titulo = "Confirmación por voz interrumpida";
      detalle =
        "Modificaste los valores: confirmá con el botón o pedí que se lean de nuevo.";
      conLeerDeNuevo = true;
      break;
    case "revision_manual":
      icono = <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />;
      tono =
        "bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400";
      titulo = "No pudimos confirmar por voz";
      detalle = DETALLE_REVISION_MANUAL[estado.motivo];
      break;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Confirmación por voz"
      className={`flex items-start justify-between gap-3 rounded-md px-3 py-2 text-sm ${tono}`}
    >
      <div className="flex items-start gap-2">
        {icono}
        <div>
          <p className="font-medium">{titulo}</p>
          {detalle && <p className="text-xs opacity-90">{detalle}</p>}
        </div>
      </div>
      {conLeerDeNuevo && botonLeerDeNuevo}
    </div>
  );
}
