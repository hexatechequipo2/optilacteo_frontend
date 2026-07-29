import { Pencil } from "lucide-react";
import type { EmpresaType } from "../../types/empresa.types";
import { EmpresaAvatar } from "./EmpresaAvatar";
import { PlanBadge } from "./PlanBadge";
import { EstadoBadge } from "./EstadoBadge";
import { ModulosDots } from "./ModulosDots";

interface EmpresaCardProps {
  empresa: EmpresaType;
  onEdit: (empresa: EmpresaType) => void;
}

export function EmpresaCard({ empresa, onEdit }: EmpresaCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <EmpresaAvatar nombre={empresa.name} />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900 dark:text-white">{empresa.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{empresa.cuit}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onEdit(empresa)}
          aria-label={`Editar ${empresa.name}`}
          className="flex-shrink-0 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <PlanBadge plan={empresa.plan} />
        <EstadoBadge isActive={empresa.isActive} />
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
        <div>
          <dt className="text-slate-400 dark:text-slate-500">Usuarios</dt>
          <dd className="text-slate-600 dark:text-slate-400">{empresa.cantidadUsuarios ?? 0}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-slate-400 dark:text-slate-500">Ubicación</dt>
          <dd className="truncate text-slate-600 dark:text-slate-400">{empresa.direccion ?? "—"}</dd>
        </div>
      </dl>

      <div>
        <p className="mb-1 text-xs text-slate-400 dark:text-slate-500">Módulos</p>
        <ModulosDots modulos={empresa.modulos} />
      </div>
    </div>
  );
}
