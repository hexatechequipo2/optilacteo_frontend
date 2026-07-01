import { useState, type FormEvent } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { RadioCard } from "../../../components/ui/RadioCard";
import { Combobox } from "../../../components/ui/Combobox";
import { LOCALIDADES_CORDOBA } from "../../../data/localidades-cordoba";
import type { CreateEmpresaDto } from "../../../services/empresa.service";

// Formato CUIT argentino: XX-XXXXXXXX-X
function formatCuit(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

/** Combina calle y localidad en el campo direccion del backend */
function buildDireccion(calle: string, localidad: string): string {
  return [calle.trim(), localidad].filter(Boolean).join(", ");
}

const PLANES = [
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
];

interface FormValues {
  name: string;
  cuit: string;
  email: string;
  telefono: string;
  calle: string;
  localidad: string;
  plan: string;
}

interface FormErrors {
  name?: string;
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.name.trim()) errors.name = "El nombre es obligatorio";
  return errors;
}

const INITIAL_VALUES: FormValues = {
  name: "",
  cuit: "",
  email: "",
  telefono: "",
  calle: "",
  localidad: "",
  plan: "starter",
};

interface NuevaEmpresaModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onCreate: (dto: CreateEmpresaDto) => Promise<void>;
}

export function NuevaEmpresaModal({
  isOpen,
  isSubmitting,
  onClose,
  onCreate,
}: NuevaEmpresaModalProps) {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});

  const handleClose = () => {
    setValues(INITIAL_VALUES);
    setErrors({});
    onClose();
  };

  const set =
    (field: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const direccion = buildDireccion(values.calle, values.localidad);

    await onCreate({
      name: values.name.trim(),
      ...(values.cuit.trim() && { cuit: values.cuit.trim() }),
      ...(values.email.trim() && { email: values.email.trim() }),
      ...(values.telefono.trim() && { telefono: values.telefono.trim() }),
      ...(direccion && { direccion }),
      plan: values.plan,
    });
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Nueva empresa"
      onClose={handleClose}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="empresa-form"
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creando..." : "Crear empresa"}
          </button>
        </div>
      }
    >
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Completá los datos para registrar una nueva organización en la plataforma.
      </p>

      <form
        id="empresa-form"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-5"
      >
        <Input
          id="empresa-name"
          label="Nombre *"
          placeholder="Ej: Lácteos del Norte S.A."
          value={values.name}
          onChange={set("name")}
          error={errors.name}
          autoFocus
        />

        <Input
          id="empresa-cuit"
          label="CUIT"
          placeholder="Ej: 30-12345678-9"
          value={values.cuit}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, cuit: formatCuit(e.target.value) }))
          }
        />

        <Combobox
          id="empresa-localidad"
          label="Localidad"
          placeholder="Buscar localidad..."
          value={values.localidad}
          onChange={(v) => setValues((prev) => ({ ...prev, localidad: v }))}
          options={LOCALIDADES_CORDOBA}
        />

        <Input
          id="empresa-calle"
          label="Dirección"
          placeholder="Ej: Av. Colón 1234"
          value={values.calle}
          onChange={set("calle")}
        />

        <Input
          id="empresa-email"
          type="email"
          label="Email de contacto"
          placeholder="contacto@empresa.com"
          value={values.email}
          onChange={set("email")}
        />

        <Input
          id="empresa-telefono"
          label="Teléfono"
          placeholder="Ej: +54 351 1234567"
          value={values.telefono}
          onChange={set("telefono")}
        />

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Plan</p>
          <div className="flex flex-col gap-2">
            {PLANES.map((plan) => (
              <RadioCard
                key={plan.value}
                name="plan"
                value={plan.value}
                label={plan.label}
                checked={values.plan === plan.value}
                onChange={(v) => setValues((prev) => ({ ...prev, plan: v }))}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
