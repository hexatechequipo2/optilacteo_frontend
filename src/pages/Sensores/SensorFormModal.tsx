import { useEffect, useState, type FormEvent } from "react";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { extraerMensajeError } from "../../services/sensor.service";
import { Parametro } from "../../types/configParametro.types";
import { TipoSensor, Ubicacion, type Sensor } from "../../types/sensor.types";
import { PARAMETRO_LABEL, TIPO_SENSOR_LABEL, UBICACION_LABEL } from "./constants/parametroSensor";

// Forma común a CreateSensorDto y UpdateSensorDto: permite reusar el mismo
// formulario para alta y edición. `ubicacion` viaja solo en el alta (el
// backend no la acepta en el update, es fija una vez creado el sensor).
export interface SensorFormValues {
  nombre: string;
  tipo: TipoSensor;
  parametro: Parametro;
  ubicacion: Ubicacion;
  rangoMinFavor: number;
  rangoMaxFavor: number;
}

const TIPO_OPTIONS = [
  { value: "", label: "Seleccioná un tipo" },
  ...Object.values(TipoSensor).map((t) => ({ value: t, label: TIPO_SENSOR_LABEL[t] })),
];

const PARAMETRO_OPTIONS = [
  { value: "", label: "Seleccioná un parámetro" },
  ...Object.values(Parametro).map((p) => ({ value: p, label: PARAMETRO_LABEL[p] })),
];

const UBICACION_OPTIONS = [
  { value: "", label: "Seleccioná una ubicación" },
  ...Object.values(Ubicacion).map((u) => ({ value: u, label: UBICACION_LABEL[u] })),
];

interface FormValues {
  nombre: string;
  tipo: TipoSensor | "";
  parametro: Parametro | "";
  ubicacion: Ubicacion | "";
  rangoMinFavor: string;
  rangoMaxFavor: string;
}

interface FormErrors {
  nombre?: string;
  tipo?: string;
  parametro?: string;
  ubicacion?: string;
  rangoMinFavor?: string;
  rangoMaxFavor?: string;
}

function buildInitialValues(sensor?: Sensor): FormValues {
  if (!sensor) {
    return { nombre: "", tipo: "", parametro: "", ubicacion: "", rangoMinFavor: "", rangoMaxFavor: "" };
  }
  return {
    nombre: sensor.nombre,
    tipo: sensor.tipo,
    parametro: sensor.parametro,
    ubicacion: sensor.ubicacion,
    rangoMinFavor: String(sensor.rangoMinFavor),
    rangoMaxFavor: String(sensor.rangoMaxFavor),
  };
}

function validate(values: FormValues, esEdicion: boolean): FormErrors {
  const errors: FormErrors = {};
  if (!values.nombre.trim()) errors.nombre = "El nombre es obligatorio";
  if (!values.tipo) errors.tipo = "El tipo es obligatorio";
  if (!values.parametro) errors.parametro = "El parámetro es obligatorio";
  if (!esEdicion && !values.ubicacion) errors.ubicacion = "La ubicación es obligatoria";

  if (values.rangoMinFavor.trim() === "") {
    errors.rangoMinFavor = "Obligatorio";
  } else if (Number.isNaN(Number(values.rangoMinFavor))) {
    errors.rangoMinFavor = "Debe ser numérico";
  }

  if (values.rangoMaxFavor.trim() === "") {
    errors.rangoMaxFavor = "Obligatorio";
  } else if (Number.isNaN(Number(values.rangoMaxFavor))) {
    errors.rangoMaxFavor = "Debe ser numérico";
  }

  if (
    !errors.rangoMinFavor &&
    !errors.rangoMaxFavor &&
    Number(values.rangoMinFavor) >= Number(values.rangoMaxFavor)
  ) {
    errors.rangoMaxFavor = "Debe ser mayor al rango mínimo";
  }

  return errors;
}

interface SensorFormModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  sensor?: Sensor; // presente = modo edición
  onClose: () => void;
  onSubmit: (dto: SensorFormValues) => Promise<unknown>;
}

export function SensorFormModal({
  isOpen,
  isSubmitting,
  sensor,
  onClose,
  onSubmit,
}: SensorFormModalProps) {
  const esEdicion = !!sensor;
  const [values, setValues] = useState<FormValues>(() => buildInitialValues(sensor));
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setValues(buildInitialValues(sensor));
    setErrors({});
    setServerError("");
  }, [isOpen, sensor]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError("");
    const validationErrors = validate(values, esEdicion);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      await onSubmit({
        nombre: values.nombre.trim(),
        tipo: values.tipo as TipoSensor,
        parametro: values.parametro as Parametro,
        ubicacion: values.ubicacion as Ubicacion,
        rangoMinFavor: Number(values.rangoMinFavor),
        rangoMaxFavor: Number(values.rangoMaxFavor),
      });
      onClose();
    } catch (err) {
      const fallback = sensor
        ? "No se pudo actualizar el sensor. Intentá nuevamente."
        : "No se pudo registrar el sensor. Intentá nuevamente.";
      setServerError(extraerMensajeError(err, fallback));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={sensor ? "Editar sensor" : "Nuevo sensor"}
      description={
        sensor
          ? "Actualizá los datos del sensor"
          : "Registrá un sensor para monitorear un parámetro de calidad"
      }
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
          <Button type="submit" form="sensor-form" isLoading={isSubmitting} className="!w-auto px-6">
            {sensor ? "Guardar cambios" : "Registrar sensor"}
          </Button>
        </div>
      }
    >
      <form id="sensor-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <SectionHeader>DATOS DEL SENSOR</SectionHeader>
          <Input
            id="sensor-nombre"
            label="Nombre / identificador *"
            value={values.nombre}
            onChange={(e) => setValues((prev) => ({ ...prev, nombre: e.target.value }))}
            error={errors.nombre}
          />
          <Select
            id="sensor-tipo"
            label="Tipo de sensor *"
            options={TIPO_OPTIONS}
            value={values.tipo}
            onChange={(e) => setValues((prev) => ({ ...prev, tipo: e.target.value as TipoSensor }))}
            error={errors.tipo}
          />
          <Select
            id="sensor-parametro"
            label="Parámetro que mide *"
            options={PARAMETRO_OPTIONS}
            value={values.parametro}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, parametro: e.target.value as Parametro }))
            }
            error={errors.parametro}
          />
          <Select
            id="sensor-ubicacion"
            label="Ubicación *"
            options={UBICACION_OPTIONS}
            value={values.ubicacion}
            disabled={esEdicion}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, ubicacion: e.target.value as Ubicacion }))
            }
            error={errors.ubicacion}
          />
          {esEdicion && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              La ubicación no se puede modificar una vez creado el sensor.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <SectionHeader>RANGO FAVORABLE</SectionHeader>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="sensor-rangoMin"
              type="number"
              inputMode="decimal"
              label="Mínimo *"
              value={values.rangoMinFavor}
              onChange={(e) => setValues((prev) => ({ ...prev, rangoMinFavor: e.target.value }))}
              error={errors.rangoMinFavor}
            />
            <Input
              id="sensor-rangoMax"
              type="number"
              inputMode="decimal"
              label="Máximo *"
              value={values.rangoMaxFavor}
              onChange={(e) => setValues((prev) => ({ ...prev, rangoMaxFavor: e.target.value }))}
              error={errors.rangoMaxFavor}
            />
          </div>
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
