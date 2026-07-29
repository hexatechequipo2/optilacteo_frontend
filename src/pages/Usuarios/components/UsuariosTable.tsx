import { Pencil } from "lucide-react";
import type { UsuarioType } from "../../../types/usuario.types";

interface UsuariosTableProps {
  usuarios: UsuarioType[];
  onEdit: (usuario: UsuarioType) => void;
  onUnlock: (id: number) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function EstadoBadge({ isActive, isLocked }: { isActive: boolean; isLocked: boolean }) {
  if (isLocked) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
        Bloqueado
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
        isActive
          ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
          : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
      }`}
    >
      {isActive ? "Activo" : "Inactivo"}
    </span>
  );
}

export function UsuariosTable({ usuarios, onEdit, onUnlock }: UsuariosTableProps) {
  if (usuarios.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          No se encontraron usuarios
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Probá ajustar la búsqueda o el filtro de empresa.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Tabla (md+) */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
        <table className="w-full text-left">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Empresa</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">

                {/* Usuario */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-xs font-semibold text-white">
                      {getInitials(usuario.name)}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {usuario.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {usuario.email}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Empresa */}
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                  {usuario.empresa ? (
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-200 text-xs font-medium dark:bg-slate-700">
                        {usuario.empresa.name.slice(0, 2).toUpperCase()}
                      </div>
                      {usuario.empresa.name}
                    </div>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>

                {/* Rol */}
                <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                  {usuario?.rolNombre ?? "Sin rol"}
                </td>

                {/* Estado */}
                <td className="px-4 py-3">
                  <EstadoBadge isActive={usuario.isActive} isLocked={usuario.isLocked} />
                </td>

                {/* Acciones */}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {usuario.isLocked && (
                      <button
                        type="button"
                        onClick={() => onUnlock(usuario.id)}
                        aria-label={`Desbloquear ${usuario.name}`}
                        title="Desbloquear cuenta"
                        className="rounded-md px-2 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
                      >
                        Desbloquear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onEdit(usuario)}
                      aria-label={`Editar ${usuario.name}`}
                      className="rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile) */}
      <div className="flex flex-col gap-3 md:hidden">
        {usuarios.map((usuario) => (
          <div
            key={usuario.id}
            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-xs font-semibold text-white">
                  {getInitials(usuario.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                    {usuario.name}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {usuario.email}
                  </p>
                </div>
              </div>

              <div className="flex flex-shrink-0 items-center gap-1">
                {usuario.isLocked && (
                  <button
                    type="button"
                    onClick={() => onUnlock(usuario.id)}
                    aria-label={`Desbloquear ${usuario.name}`}
                    title="Desbloquear cuenta"
                    className="rounded-md px-2 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
                  >
                    Desbloquear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onEdit(usuario)}
                  aria-label={`Editar ${usuario.name}`}
                  className="rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <EstadoBadge isActive={usuario.isActive} isLocked={usuario.isLocked} />
            </div>

            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <div className="min-w-0">
                <dt className="text-slate-400 dark:text-slate-500">Empresa</dt>
                <dd className="truncate text-slate-600 dark:text-slate-400">
                  {usuario.empresa ? usuario.empresa.name : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-400 dark:text-slate-500">Rol</dt>
                <dd className="text-slate-600 dark:text-slate-400">
                  {usuario?.rolNombre ?? "Sin rol"}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}