import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { FieldError } from "../../../components/ui/FieldError";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import { useAuth } from "../../../hooks/useAuth";
import { useClasificacionLote } from "../../../hooks/useClasificacionLote";
import { useHistorialRevisionesLote } from "../../../hooks/useHistorialRevisionesLote";
import { useRevisarLote } from "../../../hooks/useRevisarLote";
import { EstadoLectura } from "../../../types/historialMediciones.types";
import { DecisionRevision, type Lote } from "../../../types/lote.types";
import { resolverUsuarioRevision } from "../../../utils/resolverUsuarioRevision";
import { PARAMETRO_LABEL, UNIDAD_POR_PARAMETRO } from "../../Sensores/constants/parametroSensor";

const ESTADO_PARAMETRO_LABEL: Partial<Record<EstadoLectura, string>> = {
  [EstadoLectura.NORMAL]: "Dentro de umbral",
  [EstadoLectura.FUERA_DE_RANGO]: "Fuera de umbral",
};

const ESTADO_PARAMETRO_VARIANT: Partial<Record<EstadoLectura, "success" | "danger">> = {
  [EstadoLectura.NORMAL]: "success",
  [EstadoLectura.FUERA_DE_RANGO]: "danger",
};

const JUSTIFICACION_MIN_LENGTH = 10;

const DECISION_LABEL: Record<DecisionRevision, string> = {
  [DecisionRevision.APROBADO]: "Aprobado",
  [DecisionRevision.RECHAZADO]: "Rechazado",
};

const DECISION_VARIANT: Record<DecisionRevision, "success" | "danger"> = {
  [DecisionRevision.APROBADO]: "success",
  [DecisionRevision.RECHAZADO]: "danger",
};

interface RevisionLoteModalProps {
  isOpen: boolean;
  lote: Lote | null;
  onClose: () => void;
  // Refetch de la bandeja de No Aptos: tras decidir, el lote deja de
  // calificar para GET /lotes/no-aptos y tiene que desaparecer de la lista.
  onRevisado: () => void;
}

// Wrapper que resuelve el null-check antes de delegar en el body: los hooks
// de abajo (useClasificacionLote, etc.) necesitan un Lote garantizado, no
// pueden llamarse condicionalmente respetando las reglas de hooks.
export function RevisionLoteModal({ isOpen, lote, onClose, onRevisado }: RevisionLoteModalProps) {
  if (!isOpen || !lote) return null;

  return (
    <RevisionLoteModalBody
      isOpen={isOpen}
      lote={lote}
      onClose={onClose}
      onRevisado={onRevisado}
    />
  );
}

interface RevisionLoteModalBodyProps {
  isOpen: boolean;
  lote: Lote;
  onClose: () => void;
  onRevisado: () => void;
}

function RevisionLoteModalBody({ isOpen, lote, onClose, onRevisado }: RevisionLoteModalBodyProps) {
  // Mismos parámetros/umbrales que ClasificacionAutomaticaTab (HU-21): el
  // Responsable de Calidad necesita ver a qué se debió el No Apto antes de
  // decidir, no solo el resultado final.
  const { clasificacion, isLoading: isLoadingParametros } = useClasificacionLote(lote);
  const { revisiones, isLoading: isLoadingHistorial } = useHistorialRevisionesLote(lote.id);
  const { revisar, isSubmitting, error, resetError } = useRevisarLote();
  const { user } = useAuth();

  const [decision, setDecision] = useState<DecisionRevision | null>(null);
  const [justificacion, setJustificacion] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDecision(null);
      setJustificacion("");
      setValidationError(null);
      resetError();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lote.id]);

  const confirmar = async () => {
    if (!decision) {
      setValidationError("Elegí si el lote se aprueba o se rechaza.");
      return;
    }
    if (justificacion.trim().length < JUSTIFICACION_MIN_LENGTH) {
      setValidationError(
        `La justificación es obligatoria y debe tener al menos ${JUSTIFICACION_MIN_LENGTH} caracteres.`,
      );
      return;
    }
    setValidationError(null);

    try {
      await revisar(lote.id, { decision, justificacion: justificacion.trim() });
      onRevisado();
      onClose();
    } catch {
      // El mensaje crudo de la API ya queda en `error` (useRevisarLote).
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={`Revisar lote — ${lote.codigo}`}
      description="Aprobá o rechazá el lote No Apto con una justificación obligatoria."
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            Cancelar
          </button>
          <Button
            type="button"
            className="!w-auto px-6"
            isLoading={isSubmitting}
            onClick={confirmar}
          >
            Confirmar decisión
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <SectionHeader>PARÁMETROS DEL LOTE</SectionHeader>
          {isLoadingParametros ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Cargando parámetros...</p>
          ) : !clasificacion || clasificacion.parametrosUtilizados.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Este lote no tiene parámetros registrados.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {clasificacion.parametrosUtilizados.map((p) => {
                const tieneEstadoDefinido =
                  p.estado === EstadoLectura.NORMAL || p.estado === EstadoLectura.FUERA_DE_RANGO;

                return (
                  <li
                    key={p.parametro}
                    className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm dark:border-slate-800"
                  >
                    <span className="text-slate-700 dark:text-slate-300">
                      {PARAMETRO_LABEL[p.parametro] ?? p.parametro}: {p.valor}
                      {UNIDAD_POR_PARAMETRO[p.parametro] ? ` ${UNIDAD_POR_PARAMETRO[p.parametro]}` : ""}
                      {p.umbralMin !== null && p.umbralMax !== null
                        ? ` (rango permitido: ${p.umbralMin} – ${p.umbralMax})`
                        : ""}
                    </span>

                    {tieneEstadoDefinido &&
                      ESTADO_PARAMETRO_LABEL[p.estado] &&
                      ESTADO_PARAMETRO_VARIANT[p.estado] && (
                        <Badge variant={ESTADO_PARAMETRO_VARIANT[p.estado]!}>
                          {ESTADO_PARAMETRO_LABEL[p.estado]}
                        </Badge>
                      )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {(revisiones.length > 0 || isLoadingHistorial) && (
          <div className="flex flex-col gap-3">
            <SectionHeader>REVISIONES PREVIAS</SectionHeader>
            {isLoadingHistorial ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Cargando historial...</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {revisiones.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-col gap-1.5 rounded-md border border-slate-200 px-4 py-3 text-sm dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={DECISION_VARIANT[r.decision]}>
                        {DECISION_LABEL[r.decision] ?? r.decision}
                      </Badge>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {new Date(r.createdAt).toLocaleString("es-AR")}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{r.justificacion}</p>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {resolverUsuarioRevision(r.usuarioId, user)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <SectionHeader>DECISIÓN</SectionHeader>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDecision(DecisionRevision.APROBADO)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition ${
                decision === DecisionRevision.APROBADO
                  ? "border-green-500 bg-green-50 text-green-700 dark:border-green-500 dark:bg-green-500/15 dark:text-green-400"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              Aprobar
            </button>
            <button
              type="button"
              onClick={() => setDecision(DecisionRevision.RECHAZADO)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition ${
                decision === DecisionRevision.RECHAZADO
                  ? "border-red-500 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-500/15 dark:text-red-400"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              <XCircle className="h-4 w-4" />
              Rechazar
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="justificacion"
            className="text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Justificación
          </label>
          <textarea
            id="justificacion"
            rows={4}
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            placeholder="Describí el motivo de la decisión..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-base text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>

        {validationError && <FieldError message={validationError} />}
        {error && (
          <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
