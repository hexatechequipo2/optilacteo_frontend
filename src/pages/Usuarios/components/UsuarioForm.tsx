import { useEffect, useState, type FormEvent } from "react";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Toggle } from "../../../components/ui/Toggle";
import { RadioCard } from "../../../components/ui/RadioCard";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import type { EmpresaType } from "../../../types/empresa.types";
import type { UsuarioType } from "../../../types/usuario.types";
import type { RolType } from "../../../types/rol.types";
import axios from "axios";
import { extraerMensajeError } from "../../../services/rol.service";

export interface UsuarioFormValues {
  rolId: number;
  name: string;
  email: string;
  password: string;
  empresaId: string;
  isActive: boolean;
}

// Lo tira EditarUsuarioModal cuando PATCH /user/:id salió bien pero
// PUT /roles/usuarios/:id no: el form lo muestra sin perder lo cargado.
export class RolNoAsignadoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "RolNoAsignadoError";
  }
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  empresaId?: string;
  rolId?: string;
}

interface UsuarioFormProps {
  id: string;
  usuario?: UsuarioType;
  empresas: EmpresaType[];
  roles: RolType[];
  /** Cuando viene definido (usuario de empresa), el selector de empresa se bloquea en este id. */
  empresaIdBloqueada?: number;
  // false: el rol se muestra como texto (edición sin gestion_roles:editar).
  rolEditable: boolean;
  // Se muestra en lugar de las opciones cuando no hay roles para elegir.
  mensajeSinRoles?: string;
  // Administrador: los roles dependen de la empresa elegida (?empresaId=).
  onEmpresaChange?: (empresaId: number | undefined) => void;
  onCancel?: () => void;
  onSubmit: (values: UsuarioFormValues) => Promise<void>;
}

function validate(values: {
  name: string;
  email: string;
  password: string;
  empresaId: string;
  rolId: number;
  isEditing: boolean;
  rolEditable: boolean;
}): FormErrors {
  const errors: FormErrors = {};

  if (!values.name.trim()) {
    errors.name = "El nombre es obligatorio";
  }

  if (!values.email.trim()) {
    errors.email = "El email es obligatorio";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "El email no es válido";
  }

  if (
    !values.isEditing &&
    (!values.password.trim() || values.password.length < 8)
  ) {
    errors.password = "La contraseña debe tener al menos 8 caracteres";
  }

  if (!values.empresaId) {
    errors.empresaId = "Seleccioná una empresa";
  }

  if (values.rolEditable && !values.rolId) {
    errors.rolId = "Seleccioná un rol";
  }

  return errors;
}

export function UsuarioForm({
  id,
  usuario,
  empresas,
  roles,
  empresaIdBloqueada,
  rolEditable,
  mensajeSinRoles,
  onEmpresaChange,
  onSubmit,
}: UsuarioFormProps) {
  const isEditing = !!usuario;

  const [name, setName] = useState(usuario?.name ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [password, setPassword] = useState("");
  const [rolId, setRolId] = useState<number>(usuario?.rolId ?? 0);
  // Si es usuario de empresa (empresaIdBloqueada definido), su empresa siempre
  // prevalece por sobre la que tuviera cargada el usuario.
  const [empresaId, setEmpresaId] = useState(
    empresaIdBloqueada
      ? String(empresaIdBloqueada)
      : usuario
        ? String(usuario.empresa?.id ?? "")
        : "",
  );
  const [isActive, setIsActive] = useState(usuario?.isActive ?? true);

  useEffect(() => {
    onEmpresaChange?.(empresaId ? Number(empresaId) : undefined);
    // Solo cuando cambia la empresa elegida, no en cada render del padre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError("");

    const validationErrors = validate({
      name,
      email,
      password,
      empresaId,
      rolId,
      isEditing,
      rolEditable,
    });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      await onSubmit({ name, email, password, rolId, empresaId, isActive });
    } catch (error) {
      if (error instanceof RolNoAsignadoError) {
        setServerError(`Se guardaron los datos, pero no el rol: ${error.message}`);
        return;
      }
      if (axios.isAxiosError(error)) {
        const data = error.response?.data;

        if (error.response?.status === 409) {
          if (data.field === "email") {
            setErrors((prev) => ({
              ...prev,
              email: data.message,
            }));
            return;
          }

          setServerError(data.message);
          return;
        }

        if (error.response?.status === 400 && data?.message?.includes("límite de usuarios")) {
          setServerError(
            "Esta empresa alcanzó el límite de usuarios de su plan actual. Para agregar más usuarios, contactate con OptiLácteo para ampliar el plan.",
          );
          return;
        }
      }

      // 4xx del back (permisos, protecciones de rol) llegan con un mensaje
      // para el usuario; un 5xx no, va el genérico.
      const esErrorDeCliente =
        axios.isAxiosError(error) && (error.response?.status ?? 500) < 500;
      setServerError(
        esErrorDeCliente
          ? extraerMensajeError(error, "No se pudo guardar el usuario. Intentá nuevamente.")
          : "No se pudo guardar el usuario. Intentá nuevamente.",
      );
    }
  };

  const empresaOptions = [
    { value: "", label: "Seleccioná una empresa" },
    ...empresas.map((e) => ({ value: String(e.id), label: e.name })),
  ];

  return (
    <form id={id} onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-3">
        <SectionHeader>IDENTIDAD</SectionHeader>
        <Input
          label="Nombre y apellido *"
          placeholder="Ej: Lucía Fernández"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <Input
          type="email"
          label="Correo electrónico *"
          placeholder="usuario@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        {!isEditing && (
          <Input
            type="password"
            label="Contraseña *"
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
          label="Organización *"
          options={empresaOptions}
          value={empresaId}
          onChange={(e) => {
            setEmpresaId(e.target.value);
            // Los roles cambian con la empresa: la elección previa ya no vale.
            setRolId(0);
          }}
          error={errors.empresaId}
          disabled={!!empresaIdBloqueada}
        />
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeader>ROL</SectionHeader>
        <div className="flex flex-col gap-2">
          {!rolEditable && (
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {usuario?.rolNombre ?? "Sin rol"}
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                Tu rol no puede cambiar el rol de otros usuarios.
              </span>
            </p>
          )}
          {rolEditable && roles.length === 0 && mensajeSinRoles && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{mensajeSinRoles}</p>
          )}
          {rolEditable && roles.map((rol) => (
            <RadioCard
              key={rol.id}
              name="role-group"
              value={String(rol.id)}
              label={rol.nombre}
              checked={rolId === rol.id}
              onChange={(value) => setRolId(Number(value))}
            />
          ))}

          {errors.rolId && (
            <p className="text-sm text-red-600">{errors.rolId}</p>
          )}
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