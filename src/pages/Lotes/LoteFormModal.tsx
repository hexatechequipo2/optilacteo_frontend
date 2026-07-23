import { useEffect, useState, type FormEvent } from "react";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { RadioCard } from "../../components/ui/RadioCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { extraerMensajeError } from "../../services/lote.service";
import { useConfigParametros } from "../../hooks/useConfigParametros";
import {
  ORDEN_PARAMETROS,
  PARAMETROS_META,
  TIPO_MATERIA_PRIMA_TABS,
  type ParametroVisible,
} from "../Configuracion/constants/parametrosCalidad";
import { TipoMateriaPrima } from "../../types/configParametro.types";
import type { ConfigParametro } from "../../types/configParametro.types";
import {
  ClasificacionLote,
  DestinoLote,
  type CreateLoteDto,
  type LoteParametro,
} from "../../types/lote.types";
import type { Proveedor } from "../../types/proveedor.types";

const CLASIFICACION_OPTIONS = [
  { value: "", label: "Seleccioná una clasificación" },
  { value: ClasificacionLote.PRIMERA, label: "Primera" },
  { value: ClasificacionLote.SEGUNDA, label: "Segunda" },
  { value: ClasificacionLote.TERCERA, label: "Tercera" },
  { value: ClasificacionLote.RECHAZADO, label: "Rechazado" },
];

const DESTINO_OPTIONS = [
  { value: "", label: "Seleccioná un destino" },
  { value: DestinoLote.PRODUCCION, label: "Producción" },
  { value: DestinoLote.ALMACENAMIENTO, label: "Almacenamiento" },
  { value: DestinoLote.TRATAMIENTO, label: "Tratamiento" },
  { value: DestinoLote.DESCARTE, label: "Descarte" },
];

interface FormValues {
  proveedorId: string;
  materiaPrima: TipoMateriaPrima;
  fechaIngreso: string;
  parametros: Record<ParametroVisible, string>;
  clasificacion: ClasificacionLote | "";
  destinoInicial: DestinoLote | "";
}

interface FormErrors {
  proveedorId?: string;
  fechaIngreso?: string;
  clasificacion?: string;
  destinoInicial?: string;
  parametros?: Partial<Record<ParametroVisible, string>>;
}

function buildParametrosVacios(): Record<ParametroVisible, string> {
  return ORDEN_PARAMETROS.reduce(
    (acc, parametro) => ({ ...acc, [parametro]: "" }),
    {} as Record<ParametroVisible, string>,
  );
}

function buildInitialValues(): FormValues {
  return {
    proveedorId: "",
    materiaPrima: TipoMateriaPrima.LECHE_CRUDA,
    fechaIngreso: new Date().toISOString().slice(0, 10),
    parametros: buildParametrosVacios(),
    clasificacion: "",
    destinoInicial: "",
  };
}

// El rango permitido por parámetro depende de la configuración de umbrales
// de la empresa para esa combinación parametro + materiaPrima (HU-09), no
// de un rango físico estático: es lo mismo que valida el backend al crear.
function buscarConfig(
  configs: ConfigParametro[],
  parametro: ParametroVisible,
  materiaPrima: TipoMateriaPrima,
): ConfigParametro | undefined {
  return configs.find((c) => c.parametro === parametro && c.tipoMateriaPrima === materiaPrima);
}

function validate(values: FormValues, configs: ConfigParametro[]): FormErrors {
  const errors: FormErrors = {};

  if (!values.proveedorId) errors.proveedorId = "El proveedor es obligatorio";
  if (!values.fechaIngreso) errors.fechaIngreso = "La fecha de ingreso es obligatoria";
  if (!values.clasificacion) errors.clasificacion = "La clasificación es obligatoria";
  if (!values.destinoInicial) errors.destinoInicial = "El destino inicial es obligatorio";

  const parametrosErrors: Partial<Record<ParametroVisible, string>> = {};
  for (const parametro of ORDEN_PARAMETROS) {
    const raw = values.parametros[parametro];

    if (raw.trim() === "") {
      parametrosErrors[parametro] = "Obligatorio";
      continue;
    }
    const valor = Number(raw);
    if (Number.isNaN(valor)) {
      parametrosErrors[parametro] = "Debe ser numérico";
      continue;
    }

    // El rol Responsable de calidad no tiene acceso de lectura a GET
    // /config-parametros (solo Gerente, ver config-parametro.controller.ts),
    // así que "configs" puede llegar vacío aunque los umbrales sí existan.
    // Cuando no hay match no bloqueamos en el cliente: el backend vuelve a
    // validar el rango real en el POST /lotes y devuelve el error ahí.
    const config = buscarConfig(configs, parametro, values.materiaPrima);
    if (config && (valor < config.umbralMin || valor > config.umbralMax)) {
      parametrosErrors[parametro] = `Debe estar entre ${config.umbralMin} y ${config.umbralMax}`;
    }
  }
  if (Object.keys(parametrosErrors).length > 0) errors.parametros = parametrosErrors;

  return errors;
}

interface LoteFormModalProps {
  isOpen: boolean;
  proveedores: Proveedor[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateLoteDto) => Promise<unknown>;
}

export function LoteFormModal({
  isOpen,
  proveedores,
  isSubmitting,
  onClose,
  onSubmit,
}: LoteFormModalProps) {
  const { configs } = useConfigParametros();
  const [values, setValues] = useState<FormValues>(buildInitialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setValues(buildInitialValues());
    setErrors({});
    setServerError("");
  }, [isOpen]);

  if (!isOpen) return null;

  const proveedorOptions = [
    { value: "", label: "Seleccioná un proveedor" },
    ...proveedores.map((p) => ({ value: String(p.id), label: `${p.razonSocial} (${p.cuit})` })),
  ];

  const setParametro = (parametro: ParametroVisible, valor: string) => {
    setValues((prev) => ({ ...prev, parametros: { ...prev.parametros, [parametro]: valor } }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError("");
    const validationErrors = validate(values, configs);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const parametros: LoteParametro[] = ORDEN_PARAMETROS.map((parametro) => ({
      parametro,
      valor: Number(values.parametros[parametro]),
    }));

    try {
      await onSubmit({
        proveedorId: Number(values.proveedorId),
        materiaPrima: values.materiaPrima,
        fechaIngreso: new Date(values.fechaIngreso).toISOString(),
        clasificacion: values.clasificacion as ClasificacionLote,
        destinoInicial: values.destinoInicial as DestinoLote,
        parametros,
      });
      onClose();
    } catch (err) {
      setServerError(extraerMensajeError(err, "No se pudo registrar el lote. Intentá nuevamente."));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Nuevo lote"
      description="Registrá el lote recibido con toda la información requerida"
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
          <Button type="submit" form="lote-form" isLoading={isSubmitting} className="!w-auto px-6">
            Registrar lote
          </Button>
        </div>
      }
    >
      <form id="lote-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        {/* Datos del lote */}
        <div className="flex flex-col gap-3">
          <SectionHeader>DATOS DEL LOTE</SectionHeader>
          <Select
            id="lote-proveedor"
            label="Proveedor *"
            options={proveedorOptions}
            value={values.proveedorId}
            onChange={(e) => setValues((prev) => ({ ...prev, proveedorId: e.target.value }))}
            error={errors.proveedorId}
          />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Tipo de materia prima *
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {TIPO_MATERIA_PRIMA_TABS.map((tab) => (
                <RadioCard
                  key={tab.value}
                  name="materiaPrima"
                  value={tab.value}
                  label={tab.label}
                  checked={values.materiaPrima === tab.value}
                  onChange={(value) =>
                    setValues((prev) => ({ ...prev, materiaPrima: value as TipoMateriaPrima }))
                  }
                />
              ))}
            </div>
          </div>

          <Input
            id="lote-fechaIngreso"
            type="date"
            label="Fecha de ingreso *"
            value={values.fechaIngreso}
            onChange={(e) => setValues((prev) => ({ ...prev, fechaIngreso: e.target.value }))}
            error={errors.fechaIngreso}
          />
        </div>

        {/* Parámetros de calidad */}
        <div className="flex flex-col gap-3">
          <SectionHeader>PARÁMETROS DE CALIDAD *</SectionHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ORDEN_PARAMETROS.map((parametro) => {
              const meta = PARAMETROS_META[parametro];
              const config = buscarConfig(configs, parametro, values.materiaPrima);
              return (
                <Input
                  key={parametro}
                  id={`lote-param-${parametro}`}
                  label={`${meta.label} (${meta.unidad})`}
                  type="number"
                  inputMode="decimal"
                  placeholder={config ? `${config.umbralMin} a ${config.umbralMax}` : ""}
                  value={values.parametros[parametro]}
                  onChange={(e) => setParametro(parametro, e.target.value)}
                  error={errors.parametros?.[parametro]}
                />
              );
            })}
          </div>
        </div>

        {/* Clasificación y destino */}
        <div className="flex flex-col gap-3">
          <SectionHeader>CLASIFICACIÓN Y DESTINO</SectionHeader>
          <div className="grid grid-cols-2 gap-3">
            <Select
              id="lote-clasificacion"
              label="Clasificación *"
              options={CLASIFICACION_OPTIONS}
              value={values.clasificacion}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, clasificacion: e.target.value as ClasificacionLote }))
              }
              error={errors.clasificacion}
            />
            <Select
              id="lote-destino"
              label="Destino inicial *"
              options={DESTINO_OPTIONS}
              value={values.destinoInicial}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, destinoInicial: e.target.value as DestinoLote }))
              }
              error={errors.destinoInicial}
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
