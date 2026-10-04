import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { ConfirmModal } from "../../../components/ui/ConfirmModal";
import { Input } from "../../../components/ui/Input";
import { extraerMensajeError } from "../../../services/rol.service";
import type { FlagsPermiso, ModuloPermiso } from "../../../types/permisos.types";
import type { GuardarRolDto, RolType } from "../../../types/rol.types";
import {
  ACCIONES,
  ESTADO_LABEL,
  MODULOS_ADMIN,
  MODULOS_SISTEMA,
  PRESETS,
  SIN_ACCESO,
  cambiarFlag,
  estadoDesdeFlags,
  gestionaRoles,
  type EstadoCelda,
} from "../../../utils/permisosMatriz";

interface RolEditorProps {
  // null = alta de un rol nuevo.
  rol: RolType | null;
  // Módulos de sistema que la empresa tiene contratados: el back rechaza
  // otorgar los demás. null = no se sabe (se muestran todos).
  modulosContratados: Set<ModuloPermiso> | null;
  // gestion_roles:crear (alta) o :editar (edición).
  puedeGuardar: boolean;
  // gestion_roles:eliminar
  puedeEliminar: boolean;
  // El rol que se edita es el del usuario logueado.
  esRolPropio: boolean;
  onGuardar: (dto: GuardarRolDto) => Promise<void>;
  onEliminar: () => Promise<void>;
}

type Matriz = Partial<Record<ModuloPermiso, FlagsPermiso>>;

function matrizInicial(rol: RolType | null): Matriz {
  const matriz: Matriz = {};
  rol?.permisos.forEach(({ modulo, ...flags }) => {
    matriz[modulo] = flags;
  });
  return matriz;
}

function motivoNoEliminable(rol: RolType): string | null {
  if (rol.esSistema) return "No se puede eliminar el rol Administrador.";
  if (rol.esCatalogo) return "Los roles del catálogo no se pueden eliminar.";
  if (rol.usuarios > 0) {
    return `Tiene ${rol.usuarios} usuario(s) asignado(s). Reasignalos antes de eliminarlo.`;
  }
  return null;
}

// El padre lo monta con key={rol?.id ?? "nuevo"}: al cambiar de rol se
// re-inicializa el formulario con la matriz guardada.
export function RolEditor({
  rol,
  modulosContratados,
  puedeGuardar,
  puedeEliminar,
  esRolPropio,
  onGuardar,
  onEliminar,
}: RolEditorProps) {
  const [nombre, setNombre] = useState(rol?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(rol?.descripcion ?? "");
  const [matriz, setMatriz] = useState<Matriz>(() => matrizInicial(rol));
  const [nombreError, setNombreError] = useState("");
  const [serverError, setServerError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmandoBaja, setConfirmandoBaja] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const modulosSistema = useMemo(
    () =>
      MODULOS_SISTEMA.filter((m) => !modulosContratados || modulosContratados.has(m.modulo)),
    [modulosContratados],
  );

  const esSistema = rol?.esSistema ?? false;
  const nombreBloqueado = !!rol && (rol.esCatalogo || rol.esSistema);
  const soloLectura = !puedeGuardar || esSistema;
  // Protección visible: el back igual devuelve 409, pero se avisa antes.
  const seQuitaGestionRoles = esRolPropio && !gestionaRoles(matriz.gestion_roles);
  const motivoBaja = rol ? motivoNoEliminable(rol) : null;

  const flagsDe = (modulo: ModuloPermiso) => matriz[modulo] ?? SIN_ACCESO;

  const actualizarFila = (modulo: ModuloPermiso, flags: FlagsPermiso) => {
    setMatriz((prev) => ({ ...prev, [modulo]: flags }));
    setMensajeExito("");
    setServerError("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const nombreLimpio = nombre.trim();
    if (nombreLimpio.length < 3 || nombreLimpio.length > 60) {
      setNombreError("El nombre debe tener entre 3 y 60 caracteres.");
      return;
    }
    setNombreError("");
    setServerError("");
    setMensajeExito("");
    setIsSaving(true);
    try {
      const modulos = [...modulosSistema, ...MODULOS_ADMIN].map((m) => m.modulo);
      await onGuardar({
        nombre: nombreLimpio,
        descripcion: descripcion.trim() || undefined,
        permisos: modulos.map((modulo) => ({ modulo, ...flagsDe(modulo) })),
      });
      setMensajeExito("Los cambios se guardaron correctamente.");
    } catch (err) {
      setServerError(extraerMensajeError(err, "No se pudo guardar el rol. Intentá nuevamente."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEliminar = async () => {
    setIsDeleting(true);
    setServerError("");
    try {
      await onEliminar();
    } catch (err) {
      setServerError(extraerMensajeError(err, "No se pudo eliminar el rol. Intentá nuevamente."));
    } finally {
      setIsDeleting(false);
      setConfirmandoBaja(false);
    }
  };

  const renderGrupo = (titulo: string, modulos: { modulo: ModuloPermiso; label: string }[]) => (
    <>
      <tr className="bg-slate-50 dark:bg-slate-800/50">
        <td
          colSpan={2 + ACCIONES.length}
          className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
        >
          {titulo}
        </td>
      </tr>
      {modulos.map(({ modulo, label }) => {
        const flags = flagsDe(modulo);
        const estado = estadoDesdeFlags(flags);
        return (
          <tr key={modulo} className="text-sm">
            <td className="px-4 py-2 text-slate-700 dark:text-slate-300">{label}</td>
            <td className="px-4 py-2">
              <select
                aria-label={`Acceso a ${label}`}
                value={estado}
                disabled={soloLectura || isSaving}
                onChange={(e) => {
                  const valor = e.target.value as EstadoCelda;
                  if (valor !== "PERSONALIZADO") actualizarFila(modulo, { ...PRESETS[valor] });
                }}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {(Object.keys(ESTADO_LABEL) as EstadoCelda[]).map((e) => (
                  <option key={e} value={e} disabled={e === "PERSONALIZADO"}>
                    {ESTADO_LABEL[e]}
                  </option>
                ))}
              </select>
            </td>
            {ACCIONES.map(({ flag, label: accionLabel }) => (
              <td key={flag} className="px-4 py-2 text-center">
                <input
                  type="checkbox"
                  aria-label={`${accionLabel} en ${label}`}
                  checked={flags[flag]}
                  disabled={soloLectura || isSaving}
                  onChange={(e) => actualizarFila(modulo, cambiarFlag(flags, flag, e.target.checked))}
                  className="h-4 w-4 accent-blue-600 disabled:opacity-60"
                />
              </td>
            ))}
          </tr>
        );
      })}
    </>
  );

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="rol-nombre"
          label="Nombre *"
          placeholder="Ej: Supervisor de calidad"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={nombreError}
          disabled={nombreBloqueado || soloLectura || isSaving}
        />
        <Input
          id="rol-descripcion"
          label="Descripción"
          placeholder="Opcional"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          disabled={nombreBloqueado || soloLectura || isSaving}
        />
      </div>

      {nombreBloqueado && !esSistema && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Rol del catálogo: se pueden ajustar sus permisos para tu empresa, pero no renombrarlo ni
          eliminarlo.
        </p>
      )}

      {esSistema ? (
        <div className="flex items-center gap-3 rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3 text-sm text-slate-700 dark:border-blue-500/20 dark:bg-blue-500/5 dark:text-slate-300">
          <ShieldCheck className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          Acceso total a todos los módulos. El rol Administrador no se puede modificar.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold tracking-wide text-slate-400 dark:border-slate-800 dark:text-slate-500">
                <th className="px-4 py-3">MÓDULO</th>
                <th className="px-4 py-3">ACCESO</th>
                {ACCIONES.map(({ flag, label }) => (
                  <th key={flag} className="px-4 py-3 text-center">
                    {label.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {renderGrupo("Módulos del sistema", modulosSistema)}
              {renderGrupo("Administración", MODULOS_ADMIN)}
            </tbody>
          </table>
        </div>
      )}

      {seQuitaGestionRoles && !esSistema && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
        >
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          No podés quitarte la gestión de roles: este es tu propio rol y necesita "Ver" y "Editar"
          en Gestión de roles.
        </p>
      )}

      {serverError && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400"
        >
          {serverError}
        </p>
      )}
      {mensajeExito && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-500/15 dark:text-green-400">
          {mensajeExito}
        </p>
      )}

      {!soloLectura ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {rol && puedeEliminar ? (
            <button
              type="button"
              onClick={() => setConfirmandoBaja(true)}
              disabled={!!motivoBaja || isDeleting}
              title={motivoBaja ?? "Eliminar rol"}
              className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar rol
            </button>
          ) : (
            <span />
          )}
          <Button
            type="submit"
            className="!w-auto px-6"
            isLoading={isSaving}
            disabled={seQuitaGestionRoles}
          >
            {rol ? "Guardar cambios" : "Crear rol"}
          </Button>
        </div>
      ) : (
        !esSistema && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Solo lectura: tu rol no puede modificar roles.
          </p>
        )
      )}

      {rol && motivoBaja && puedeEliminar && !soloLectura && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{motivoBaja}</p>
      )}

      <ConfirmModal
        isOpen={confirmandoBaja}
        title={`¿Eliminar el rol ${rol?.nombre ?? ""}?`}
        description="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={() => void handleEliminar()}
        onCancel={() => setConfirmandoBaja(false)}
      />
    </form>
  );
}
