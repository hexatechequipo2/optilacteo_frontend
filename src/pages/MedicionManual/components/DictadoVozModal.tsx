import { useState } from "react";
import { AlertTriangle, AudioLines, Mic, MicOff, Pause, X } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import type { BadgeVariant } from "../../../components/ui/Badge";
import type { EstadoReconocimientoVoz } from "../../../types/dictadoVoz.types";

// HU-55: modo de dictado por voz para "Medición manual". Captura real con
// la Web Speech API (useSpeechRecognition, ver DictadoVozFlow) — este
// componente sigue sin tener estado de negocio propio, todo llega por
// props para que quien lo use decida cómo arrancar/parar el micrófono y
// cuándo mandar el texto a /dictado/parsear.
//
// A diferencia del mock original, acá no hay una lista de "parámetros
// capturados" en vivo: el reconocedor solo produce texto, la interpretación
// por parámetro llega recién con la respuesta del backend (ver
// RevisionDictadoVozModal), no se puede armar en tiempo real.

const ESTADO_BADGE_VARIANT: Record<EstadoReconocimientoVoz, BadgeVariant> = {
  inactivo: "neutral",
  escuchando: "danger",
  pausado: "neutral",
  permiso_denegado: "danger",
  no_soportado: "neutral",
};

const ESTADO_LABEL: Record<EstadoReconocimientoVoz, string> = {
  inactivo: "En espera",
  escuchando: "Escuchando",
  pausado: "Pausado",
  permiso_denegado: "Permiso denegado",
  no_soportado: "No disponible",
};

interface DictadoVozModalProps {
  isOpen: boolean;
  estado: EstadoReconocimientoVoz;
  transcripcionInterina: string;
  transcripcionAcumulada: string;
  isEnviando: boolean;
  errorEnvio?: string | null;
  onClose: () => void;
  onPausarOEscuchar: () => void;
  onConfirmar: () => void;
}

export function DictadoVozModal({
  isOpen,
  estado,
  transcripcionInterina,
  transcripcionAcumulada,
  isEnviando,
  errorEnvio,
  onClose,
  onPausarOEscuchar,
  onConfirmar,
}: DictadoVozModalProps) {
  // Cancelar a mitad del dictado no debe descartar texto capturado sin
  // avisar: si ya hay algo dictado, se pide confirmación antes de cerrar.
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);

  if (!isOpen) return null;

  const hayTextoCapturado = transcripcionAcumulada.trim() !== "";
  const bloqueante = estado === "permiso_denegado" || estado === "no_soportado";
  const escuchando = estado === "escuchando";

  const pedirCierre = () => {
    if (hayTextoCapturado && !bloqueante) {
      setConfirmandoCancelar(true);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Dictando valores"
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl dark:bg-slate-900"
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
                Decí el parámetro y el valor, uno por uno
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={pedirCierre}
            aria-label="Cerrar"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          {bloqueante ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400">
                {estado === "permiso_denegado" ? (
                  <MicOff className="h-8 w-8" />
                ) : (
                  <AlertTriangle className="h-8 w-8" />
                )}
              </span>
              <Badge variant={ESTADO_BADGE_VARIANT[estado]}>
                {ESTADO_LABEL[estado]}
              </Badge>
              {estado === "permiso_denegado" ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  No pudimos acceder al micrófono. Revisá los permisos del
                  navegador para este sitio, o cargá los valores a mano con
                  el formulario de abajo.
                </p>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Este navegador no soporta dictado por voz. Usá el
                  formulario manual de abajo para cargar los valores.
                </p>
              )}
            </div>
          ) : confirmandoCancelar ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
                <AlertTriangle className="h-7 w-7" />
              </span>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                ¿Descartar el dictado en curso?
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                El texto que ya dictaste no se guarda si salís ahora.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-2 py-2">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                  <AudioLines className="h-8 w-8" />
                </span>
                <Badge variant={ESTADO_BADGE_VARIANT[estado]}>
                  {ESTADO_LABEL[estado]}
                </Badge>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
                  TRANSCRIPCIÓN EN VIVO
                </span>
                <div className="min-h-[4.5rem] rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {transcripcionAcumulada || transcripcionInterina ? (
                    <>
                      {transcripcionAcumulada}{" "}
                      <span className="text-slate-400 italic dark:text-slate-500">
                        {transcripcionInterina}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">
                      Decí el parámetro y el valor, por ejemplo: "pH 6.8,
                      temperatura 4 grados"...
                    </span>
                  )}
                </div>
              </div>

              {errorEnvio && (
                <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/15 dark:text-red-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorEnvio}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
          {bloqueante ? (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center rounded-lg bg-[#3d6fcf] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3460b5]"
            >
              Ir al ingreso manual
            </button>
          ) : confirmandoCancelar ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmandoCancelar(false)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Seguir dictando
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                Sí, descartar
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onPausarOEscuchar}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {escuchando ? (
                    <>
                      <Pause className="h-4 w-4" /> Pausar
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" /> Escuchar
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={pedirCierre}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-slate-700 dark:hover:bg-red-500/10"
                >
                  <X className="h-4 w-4" /> Cancelar
                </button>
              </div>
              <button
                type="button"
                onClick={onConfirmar}
                disabled={!hayTextoCapturado || isEnviando}
                className="flex items-center justify-center rounded-lg bg-[#3d6fcf] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3460b5] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isEnviando ? "Interpretando..." : "Revisar y confirmar"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
