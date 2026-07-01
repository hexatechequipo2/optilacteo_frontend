import { useState, useEffect, type FormEvent } from "react";
import axios from "axios";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { RadioCard } from "../../../components/ui/RadioCard";
import { Toggle } from "../../../components/ui/Toggle";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import { Combobox } from "../../../components/ui/Combobox";
import { LOCALIDADES_CORDOBA } from "../../../data/localidades-cordoba";
import type { EmpresaType, UpdateEmpresaDto } from "../../../types/empresa.types";

const PLANES = [
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
];

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

/**
 * Intenta separar el campo direccion del backend en calle + localidad.
 * Si el último segmento coincide con una localidad conocida, lo extrae.
 * Caso contrario, pone todo en calle y deja localidad vacía.
 */
function parseDireccion(direccion: string | null): { calle: string; localidad: string } {
  if (!direccion) return { calle: "", localidad: "" };
  const parts = direccion.split(", ");
  const lastPart = parts[parts.length - 1];
  if (parts.length > 1 && LOCALIDADES_CORDOBA.includes(lastPart)) {
    return {
      calle: parts.slice(0, -1).join(", "),
      localidad: lastPart,
    };
  }
  return { calle: direccion, localidad: "" };
}

interface FormValues {
  name: string;
  cuit: string;
  email: string;
  telefono: string;
  calle: string;
  localidad: string;
  plan: string;
  isActive: boolean;
}

interface FormErrors {
  name?: string;
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  if (!values.name.trim()) errors.name = "El nombre es obligatorio";
  return errors;
}

function empresaToFormValues(empresa: EmpresaType): FormValues {
  const { calle, localidad } = parseDireccion(empresa.direccion);
  return {
    name: empresa.name,
    cuit: empresa.cuit ?? "",
    email: empresa.email ?? "",
    telefono: empresa.telefono ?? "",
    calle,
    localidad,
    plan: empresa.plan,
    isActive: empresa.isActive,
  };
}

interface EditarEmpresaModalProps {
  empresa: EmpresaType | null;
  isSubmitting: boolean;
  onClose: () => void;
  onUpdate: (id: number, dto: UpdateEmpresaDto, nuevoEstado: boolean) => Promise<void>;
}

export function EditarEmpresaModal({
  empresa,
  isSubmitting,
  onClose,
  onUpdate,
}: EditarEmpresaModalProps) {
  const [values, setValues] = useState<FormValues>(() =>
    empresa ? empresaToFormValues(empresa) : empresaToFormValues({} as EmpresaType),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");

  // Sincroniza el formulario cuando se abre con una empresa diferente
  useEffect(() => {
    if (empresa) {
      setValues(empresaToFormValues(empresa));
      setErrors({});
      setServerError("");
    }
  }, [empresa]);

  if (!empresa) return null;

  const set =
    (field: keyof FormValues) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError("");

    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    const direccion = buildDireccion(values.calle, values.localidad);

    try {
      await onUpdate(
        empresa.id,
        {
          name: values.name.trim(),
          ...(values.cuit.trim() && { cuit: values.cuit.trim() }),
          ...(values.email.trim() && { email: values.email.trim() }),
          ...(values.telefono.trim() && { telefono: values.telefono.trim() }),
          ...(direccion && { direccion }),
          plan: values.plan,
        },
        values.isActive,
      );
      onClose();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setServerError(
          "No se puede suspender la empresa porque tiene usuarios activos asociados.",
        );
      } else {
        setServerError("No se pudo guardar los cambios. Intentá nuevamente.");
      }
    }
  };

  return (
    <Modal
      isOpen={!!empresa}
      title="Editar empresa"
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
          <button
            type="submit"
            form="empresa-form-edit"
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      }
    >
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Editá la información de la organización.
      </p>

      <form
        id="empresa-form-edit"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-3">
          <SectionHeader>DATOS GENERALES</SectionHeader>
          <Input
            id="edit-empresa-name"
            label="Nombre *"
            placeholder="Ej: Lácteos del Norte S.A."
            value={values.name}
            onChange={set("name")}
            error={errors.name}
          />
          <Input
            id="edit-empresa-cuit"
            label="CUIT"
            placeholder="Ej: 30-12345678-9"
            value={values.cuit}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, cuit: formatCuit(e.target.value) }))
            }
          />
          <Combobox
            id="edit-empresa-localidad"
            label="Localidad"
            placeholder="Buscar localidad..."
            value={values.localidad}
            onChange={(v) => setValues((prev) => ({ ...prev, localidad: v }))}
            options={LOCALIDADES_CORDOBA}
          />
          <Input
            id="edit-empresa-calle"
            label="Dirección"
            placeholder="Ej: Av. Colón 1234"
            value={values.calle}
            onChange={set("calle")}
          />
          <Input
            id="edit-empresa-email"
            type="email"
            label="Email de contacto"
            placeholder="contacto@empresa.com"
            value={values.email}
            onChange={set("email")}
          />
          <Input
            id="edit-empresa-telefono"
            label="Teléfono"
            placeholder="Ej: +54 351 1234567"
            value={values.telefono}
            onChange={set("telefono")}
          />
        </div>

        <div className="flex flex-col gap-3">
          <SectionHeader>PLAN</SectionHeader>
          <div className="flex flex-col gap-2">
            {PLANES.map((plan) => (
              <RadioCard
                key={plan.value}
                name="edit-plan"
                value={plan.value}
                label={plan.label}
                checked={values.plan === plan.value}
                onChange={(v) => setValues((prev) => ({ ...prev, plan: v }))}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <SectionHeader>ESTADO</SectionHeader>
          <Toggle
            id="edit-empresa-isActive"
            checked={values.isActive}
            onChange={(checked) =>
              setValues((prev) => ({ ...prev, isActive: checked }))
            }
            label={values.isActive ? "Empresa activa" : "Empresa suspendida"}
          />
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
