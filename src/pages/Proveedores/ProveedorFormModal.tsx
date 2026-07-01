import { useState, useEffect, type FormEvent } from "react";
import { Droplets, Truck, Package, FlaskConical } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { SectionHeader } from "../../components/ui/SectionHeader";
import type { EmpresaType } from "../../types/empresa.types";
import type {
  Proveedor,
  TipoProveedor,
  EstadoProveedor,
  CreateProveedorDto,
} from "../../types/proveedor.types";

// ─── Datos estáticos ────────────────────────────────────────────────────────

const TIPOS = [
  { value: "tambo" as TipoProveedor, label: "Tambo", icon: Droplets },
  { value: "transporte" as TipoProveedor, label: "Transporte", icon: Truck },
  { value: "insumos" as TipoProveedor, label: "Insumos", icon: Package },
  {
    value: "laboratorio" as TipoProveedor,
    label: "Laboratorio",
    icon: FlaskConical,
  },
];

const ESTADOS: { value: EstadoProveedor; label: string }[] = [
  { value: "activa", label: "Activa" },
  { value: "trial", label: "Trial" },
  { value: "suspendida", label: "Suspendida" },
];

const ESTADO_SELECTED_CLASS: Record<EstadoProveedor, string> = {
  activa: "border-green-500 bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400",
  trial: "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
  suspendida: "border-slate-400 bg-slate-100 text-slate-600 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const PROVINCIAS = [
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Ciudad Autónoma de Buenos Aires",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

const PROVINCIA_OPTIONS = [
  { value: "", label: "Seleccioná una provincia" },
  ...PROVINCIAS.map((p) => ({ value: p, label: p })),
];

function capacidadLabel(tipo: TipoProveedor): string {
  if (tipo === "tambo") return "Volumen de entrega (L/día)";
  if (tipo === "transporte") return "Viajes por semana";
  return "";
}

function formatCuit(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

// ─── Tipos del formulario ────────────────────────────────────────────────────

interface FormValues {
  tipo: TipoProveedor;
  razonSocial: string;
  cuit: string;
  telefono: string;
  emailContacto: string;
  empresaId: string;
  provincia: string;
  localidad: string;
  capacidad: string;
  estado: EstadoProveedor;
}

interface FormErrors {
  razonSocial?: string;
  cuit?: string;
  empresaId?: string;
}

const INITIAL_VALUES: FormValues = {
  tipo: "tambo",
  razonSocial: "",
  cuit: "",
  telefono: "",
  emailContacto: "",
  empresaId: "",
  provincia: "",
  localidad: "",
  capacidad: "",
  estado: "activa",
};

function proveedorToFormValues(p: Proveedor): FormValues {
  return {
    tipo: p.tipo,
    razonSocial: p.razonSocial,
    cuit: p.cuit,
    telefono: p.telefono ?? "",
    emailContacto: p.emailContacto ?? "",
    empresaId: String(p.empresaId),
    provincia: p.provincia ?? "",
    localidad: p.localidad ?? "",
    capacidad:
      p.capacidad !== null && p.capacidad !== undefined
        ? String(p.capacidad)
        : "",
    estado: p.estado,
  };
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.razonSocial.trim())
    errors.razonSocial = "La razón social es obligatoria";
  if (!values.cuit.trim()) {
    errors.cuit = "El CUIT es obligatorio";
  } else if (!/^\d{2}-\d{8}-\d{1}$/.test(values.cuit)) {
    errors.cuit = "El CUIT debe tener el formato XX-XXXXXXXX-X";
  }
  if (!values.empresaId) errors.empresaId = "La empresa es obligatoria";
  return errors;
}

// ─── Componente ─────────────────────────────────────────────────────────────

interface ProveedorFormModalProps {
  isOpen: boolean;
  proveedor: Proveedor | null;
  empresas: EmpresaType[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateProveedorDto) => Promise<void>;
}

export function ProveedorFormModal({
  isOpen,
  proveedor,
  empresas,
  isSubmitting,
  onClose,
  onSubmit,
}: ProveedorFormModalProps) {
  const isEditing = proveedor !== null;
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    if (proveedor) {
      setValues(proveedorToFormValues(proveedor));
    } else {
      setValues(INITIAL_VALUES);
    }
    setErrors({});
    setServerError("");
  }, [isOpen, proveedor]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const set =
    (field: keyof FormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((prev) => ({ ...prev, [field]: e.target.value }));

  const empresaOptions = [
    { value: "", label: "Seleccioná una empresa" },
    ...empresas.map((e) => ({ value: String(e.id), label: e.name })),
  ];

  const showCapacidad =
    values.tipo === "tambo" || values.tipo === "transporte";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError("");
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      await onSubmit({
        tipo: values.tipo,
        razonSocial: values.razonSocial.trim(),
        cuit: values.cuit.trim(),
        empresaId: Number(values.empresaId),
        estado: values.estado,
        ...(values.telefono.trim() && { telefono: values.telefono.trim() }),
        ...(values.emailContacto.trim() && {
          emailContacto: values.emailContacto.trim(),
        }),
        ...(values.provincia && { provincia: values.provincia }),
        ...(values.localidad.trim() && { localidad: values.localidad.trim() }),
        ...(values.capacidad && { capacidad: Number(values.capacidad) }),
      });
      onClose();
    } catch {
      setServerError("No se pudo guardar el proveedor. Intentá nuevamente.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl animate-in slide-in-from-right dark:bg-slate-900"
      >
        {/* Cabecera */}
        <div className="flex items-start justify-between border-b border-slate-100 p-6 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {isEditing ? "Editar proveedor" : "Nuevo proveedor"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Cargá el proveedor y asignalo a una empresa
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            ✕
          </button>
        </div>

        {/* Cuerpo scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <form
            id="proveedor-form"
            onSubmit={handleSubmit}
            noValidate
            className="flex flex-col gap-6"
          >
            {/* Tipo */}
            <div className="flex flex-col gap-3">
              <SectionHeader>TIPO DE PROVEEDOR</SectionHeader>
              <div className="grid grid-cols-2 gap-2">
                {TIPOS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setValues((prev) => ({ ...prev, tipo: value }))
                    }
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition ${
                      values.tipo === value
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Datos del proveedor */}
            <div className="flex flex-col gap-3">
              <SectionHeader>DATOS DEL PROVEEDOR</SectionHeader>
              <Input
                id="prov-razonSocial"
                label="Razón social *"
                placeholder="Ej: Tambo San Martín S.R.L."
                value={values.razonSocial}
                onChange={set("razonSocial")}
                error={errors.razonSocial}
                autoFocus
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="prov-cuit"
                  label="CUIT *"
                  placeholder="Ej: 20-12345678-9"
                  value={values.cuit}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      cuit: formatCuit(e.target.value),
                    }))
                  }
                  error={errors.cuit}
                />
                <Input
                  id="prov-telefono"
                  label="Teléfono"
                  placeholder="Ej: +54 351 1234567"
                  value={values.telefono}
                  onChange={set("telefono")}
                />
              </div>
              <Input
                id="prov-email"
                type="email"
                label="Email de contacto"
                placeholder="contacto@proveedor.com"
                value={values.emailContacto}
                onChange={set("emailContacto")}
              />
            </div>

            {/* Empresa y ubicación */}
            <div className="flex flex-col gap-3">
              <SectionHeader>EMPRESA Y UBICACIÓN</SectionHeader>
              <Select
                id="prov-empresa"
                label="Empresa asignada *"
                options={empresaOptions}
                value={values.empresaId}
                onChange={set("empresaId")}
                error={errors.empresaId}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  id="prov-provincia"
                  label="Provincia"
                  options={PROVINCIA_OPTIONS}
                  value={values.provincia}
                  onChange={set("provincia")}
                />
                <Input
                  id="prov-localidad"
                  label="Localidad"
                  placeholder="Ej: Villa María"
                  value={values.localidad}
                  onChange={set("localidad")}
                />
              </div>
            </div>

            {/* Capacidad — solo para Tambo y Transporte */}
            {showCapacidad && (
              <div className="flex flex-col gap-3">
                <SectionHeader>CAPACIDAD</SectionHeader>
                <Input
                  id="prov-capacidad"
                  label={capacidadLabel(values.tipo)}
                  type="number"
                  placeholder="Ej: 500"
                  value={values.capacidad}
                  onChange={set("capacidad")}
                />
              </div>
            )}

            {/* Estado */}
            <div className="flex flex-col gap-3">
              <SectionHeader>ESTADO</SectionHeader>
              <div className="flex gap-2">
                {ESTADOS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setValues((prev) => ({ ...prev, estado: value }))
                    }
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      values.estado === value
                        ? ESTADO_SELECTED_CLASS[value]
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {serverError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
                {serverError}
              </p>
            )}
          </form>
        </div>

        {/* Footer fijo */}
        <div className="border-t border-slate-100 p-6 dark:border-slate-800">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="proveedor-form"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Crear proveedor"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
