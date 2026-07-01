import { useState, type FormEvent } from "react";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Toggle } from "../../../components/ui/Toggle";
import { RadioCard } from "../../../components/ui/RadioCard";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import type { EmpresaType } from "../../../types/empresa.types";
import { Role, ROLE_LABELS } from "../../../types/usuario.types";
import type { UsuarioType } from "../../../types/usuario.types";

export interface UsuarioFormValues {
  name: string;
  email: string;
  password: string;
  role: Role;
  empresaId: string;
  isActive: boolean;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  empresaId?: string;
}

interface UsuarioFormProps {
  id: string; // ID obligatorio para conectar con el footer
  usuario?: UsuarioType;
  empresas: EmpresaType[];
  onCancel?: () => void;
  onSubmit: (values: UsuarioFormValues) => Promise<void>;
}

function validate(values: {
  name: string;
  email: string;
  password: string;
  empresaId: string;
  isEditing: boolean;
}): FormErrors {
  const errors: FormErrors = {};

  if (!values.name.trim()) errors.name = "El nombre es obligatorio";
  if (!values.email.trim()) {
    errors.email = "El email es obligatorio";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "El email no es válido";
  }

  if (!values.isEditing && (!values.password.trim() || values.password.length < 8)) {
    errors.password = "La contraseña debe tener al menos 8 caracteres";
  }

  if (!values.empresaId) errors.empresaId = "Seleccioná una empresa";

  return errors;
}

export function UsuarioForm({
  id,
  usuario,
  empresas,
  onSubmit,
}: UsuarioFormProps) {
  const isEditing = !!usuario;

  const [name, setName] = useState(usuario?.name ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>((usuario?.role as Role) ?? Role.OPERARIO_LINEA);
  const [empresaId, setEmpresaId] = useState(usuario ? String(usuario.empresa?.id ?? "") : "");
  const [isActive, setIsActive] = useState(usuario?.isActive ?? true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError("");

    const validationErrors = validate({ name, email, password, empresaId, isEditing });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      await onSubmit({ name, email, password, role, empresaId, isActive });
    } catch {
      setServerError("No se pudo guardar el usuario. Intentá nuevamente.");
    }
  };

  const empresaOptions = [
    { value: "", label: "Seleccioná una empresa" },
    ...empresas.map((e) => ({ value: String(e.id), label: e.name })),
  ];

  return (
    <form id={id} onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-3">
        <SectionHeader>IDENTIDAD</SectionHeader>
        <Input
          label="Nombre y apellido"
          placeholder="Ej. Lucía Fernández"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <Input
          type="email"
          label="Correo electrónico"
          placeholder="usuario@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        {!isEditing && (
          <Input
            type="password"
            label="Contraseña"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
          />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeader>EMPRESA ASIGNADA</SectionHeader>
        <Select
          label="Organización"
          options={empresaOptions}
          value={empresaId}
          onChange={(e) => setEmpresaId(e.target.value)}
          error={errors.empresaId}
        />
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeader>ROL</SectionHeader>
        <div className="flex flex-col gap-2">
          {Object.values(Role).map((rol) => (
            <RadioCard
              key={rol}
              name="role-group"
              value={rol}
              label={ROLE_LABELS[rol]}
              checked={role === rol}
              onChange={(value) => setRole(value as Role)}
            />
          ))}
        </div>
      </div>

      {isEditing && (
        <div className="flex flex-col gap-3">
          <SectionHeader>ESTADO</SectionHeader>
          <Toggle
            checked={isActive}
            onChange={setIsActive}
            label={isActive ? "Usuario activo" : "Usuario inactivo"}
          />
        </div>
      )}

      {serverError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">{serverError}</p>
      )}
      
      {/* Botones eliminados: ahora viven en el Footer del Modal */}
    </form>
  );
}