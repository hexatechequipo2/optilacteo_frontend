import { Badge } from "../../../components/ui/Badge";
import { getRoleLabel } from "../../../types/usuario.types";
import type { UsuarioType } from "../../../types/usuario.types";

interface UsuariosTableProps {
  usuarios: UsuarioType[];
  onEdit: (usuario: UsuarioType) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function EstadoBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge variant="success">Activo</Badge>
  ) : (
    <Badge variant="neutral">Inactivo</Badge>
  );
}

export function UsuariosTable({ usuarios, onEdit }: UsuariosTableProps) {
  if (usuarios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center">
        <p className="text-base font-medium text-slate-700">
          No se encontraron usuarios
        </p>
        <p className="text-sm text-slate-500">
          Probá ajustar la búsqueda o el filtro de empresa.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-semibold tracking-wide text-slate-400">
            <th className="px-5 py-3">USUARIO</th>
            <th className="px-5 py-3">EMPRESA</th>
            <th className="px-5 py-3">ROL</th>
            <th className="px-5 py-3">ESTADO</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {usuarios.map((usuario) => (
            <tr key={usuario.id} className="text-sm">
              <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">
                    {getInitials(usuario.name)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{usuario.name}</p>
                    <p className="text-xs text-slate-500">{usuario.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-3">
                {usuario.empresa ? (
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-[10px] font-semibold text-amber-700">
                      {usuario.empresa.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-slate-700">{usuario.empresa.name}</span>
                  </div>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-5 py-3">
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  {getRoleLabel(usuario.role)}
                </span>
              </td>
              <td className="px-5 py-3">
                <EstadoBadge isActive={usuario.isActive} />
              </td>
              <td className="px-5 py-3 text-right">
              <button
                type="button"
                onClick={() => onEdit(usuario)}
                aria-label={`Editar ${usuario.name}`}
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                {/* Clase scale-x-[-1] voltea el icono horizontalmente */}
                <span className="block scale-x-[-1]">✎</span>
              </button>
            </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}