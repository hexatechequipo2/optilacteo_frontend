import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { FieldError } from "../../../components/ui/FieldError";
import { Toggle } from "../../../components/ui/Toggle";
import { Button } from "../../../components/ui/Button";
import { extraerMensajeError } from "../../../services/notificacion.service";
import { DIAS_SEMANA } from "../constants/alertas.constants";
import type {
  ConfiguracionSilencioAlerta,
  CreateConfiguracionSilencioAlertaDto,
} from "../../../types/configuracionSilencioAlerta.types";

interface FormValues {
  nombre: string;
  horaInicio: string;
  horaFin: string;
  todosLosDias: boolean;
  diasSemana: number[];
}

interface FormErrors {
  nombre?: string;
  horaInicio?: string;
  horaFin?: string;
  diasSemana?: string;
}

function buildInitialValues(horario?: ConfiguracionSilencioAlerta): FormValues {
  if (!horario) {
    return { nombre: "", horaInicio: "", horaFin: "", todosLosDias: true, diasSemana: [] };
  }
  const diasSemana = horario.diasSemana ?? [];
  return {
    nombre: horario.nombre ?? "",
    horaInicio: horario.horaInicio,
    horaFin: horario.horaFin,
    todosLosDias: diasSemana.length === 0,
    diasSemana,
  };
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (values.nombre.length > 80) errors.nombre = "Máximo 80 caracteres";
  if (!values.horaInicio) errors.horaInicio = "La hora de inicio es obligatoria";
  if (!values.horaFin) errors.horaFin = "La hora de fin es obligatoria";
  if (values.horaInicio && values.horaFin && values.horaInicio === values.horaFin) {
    errors.horaFin = "No puede ser igual a la hora de inicio";
  }
  if (!values.todosLosDias && values.diasSemana.length === 0) {
    errors.diasSemana = 'Seleccioná al menos un día, o activá "Todos los días"';
  }
  return errors;
}

interface HorarioSilencioModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  horario?: ConfiguracionSilencioAlerta; // presente = modo edición
  onClose: () => void;
  onSubmit: (dto: CreateConfiguracionSilencioAlertaDto) => Promise<unknown>;
}

// HU-30: alta/edición de un horario de silencio. Reusa el mismo form para
// los dos casos (mismo criterio que SensorFormModal.tsx): `horario`
// presente = edición. horaInicio/horaFin van con <input type="time">, que
// ya entrega el valor en formato "HH:mm" — el mismo que espera el backend.
export function HorarioSilencioModal({
  isOpen,
  isSubmitting,
  horario,
  onClose,
  onSubmit,
}: HorarioSilencioModalProps) {
  const esEdicion = !!horario;
  const [values, setValues] = useState<FormValues>(() => buildInitialValues(horario));
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setValues(buildInitialValues(horario));
    setErrors({});
    setServerError("");
  }, [isOpen, horario]);

  if (!isOpen) return null;

  const toggleDia = (dia: number) => {
    setValues((prev) => ({
      ...prev,
      diasSemana: prev.diasSemana.includes(dia)
        ? prev.diasSemana.filter((d) => d !== dia)
        : [...prev.diasSemana, dia].sort((a, b) => a - b),
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError("");
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      await onSubmit({
        nombre: values.nombre.trim() || undefined,
        horaInicio: values.horaInicio,
        horaFin: values.horaFin,
        // Siempre se manda el array (posiblemente vacío) en vez de omitirlo:
        // en edición, omitir diasSemana conserva el valor anterior del lado
        // del backend (ver actualizarHorarioSilencio), así que activar
        // "Todos los días" necesita mandar [] explícito para limpiarlo.
        diasSemana: values.todosLosDias ? [] : values.diasSemana,
      });
      onClose();
    } catch (err) {
      const fallback = esEdicion
        ? "No se pudo actualizar el horario. Intentá nuevamente."
        : "No se pudo crear el horario. Intentá nuevamente.";
      setServerError(extraerMensajeError(err, fallback));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={esEdicion ? "Editar horario de silencio" : "Nuevo horario de silencio"}
      description="Las alertas informativas no se van a notificar en este horario (se siguen registrando en el historial)"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <Button
            type="submit"
            form="horario-silencio-form"
            isLoading={isSubmitting}
            className="!w-auto px-6"
          >
            {esEdicion ? "Guardar cambios" : "Crear horario"}
          </Button>
        </div>
      }
    >
      <form
        id="horario-silencio-form"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
        <Input
          id="horario-silencio-nombre"
          label="Nombre (opcional)"
          placeholder='Ej: "Turno nocturno"'
          value={values.nombre}
          onChange={(e) => setValues((prev) => ({ ...prev, nombre: e.target.value }))}
          error={errors.nombre}
          autoFocus
        />

        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              id="horario-silencio-hora-inicio"
              type="time"
              label="Hora de inicio *"
              value={values.horaInicio}
              onChange={(e) => setValues((prev) => ({ ...prev, horaInicio: e.target.value }))}
              error={errors.horaInicio}
            />
          </div>
          <div className="flex-1">
            <Input
              id="horario-silencio-hora-fin"
              type="time"
              label="Hora de fin *"
              value={values.horaFin}
              onChange={(e) => setValues((prev) => ({ ...prev, horaFin: e.target.value }))}
              error={errors.horaFin}
            />
          </div>
        </div>
        {values.horaInicio &&
          values.horaFin &&
          values.horaInicio > values.horaFin &&
          !errors.horaFin && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cruza la medianoche: aplica de {values.horaInicio} a {values.horaFin} del día
              siguiente.
            </p>
          )}

        <div className="flex flex-col gap-2">
          <Toggle
            id="horario-silencio-todos-los-dias"
            checked={values.todosLosDias}
            onChange={(checked) => setValues((prev) => ({ ...prev, todosLosDias: checked }))}
            label="Todos los días"
          />

          {!values.todosLosDias && (
            <div className="flex flex-wrap gap-2">
              {DIAS_SEMANA.map((dia) => {
                const seleccionado = values.diasSemana.includes(dia.value);
                return (
                  <button
                    key={dia.value}
                    type="button"
                    onClick={() => toggleDia(dia.value)}
                    aria-pressed={seleccionado}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      seleccionado
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-500/15 dark:text-blue-400"
                        : "border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                  >
                    {dia.abreviado}
                  </button>
                );
              })}
            </div>
          )}
          {errors.diasSemana && <FieldError message={errors.diasSemana} />}
        </div>

        {serverError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
            {serverError}
          </p>
        )}
      </form>
    </Modal>
  );
}
