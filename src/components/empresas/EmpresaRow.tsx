import { Pencil } from "lucide-react";
import type { EmpresaType } from "../../types/empresa.types";
import type { Plan } from "../../types/plan.types";
import { EmpresaAvatar } from "./EmpresaAvatar";
import { PlanBadge } from "./PlanBadge";
import { EstadoBadge } from "./EstadoBadge";
import { ModulosDots } from "./ModulosDots";

interface EmpresaRowProps {
  empresa: EmpresaType;
  planes: Plan[];
  onEdit: (empresa: EmpresaType) => void;
}

export function EmpresaRow({ empresa, planes, onEdit }: EmpresaRowProps) {
  return (
    <tr className="text-sm">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <EmpresaAvatar nombre={empresa.name} />
          <div>
            <p className="font-medium text-slate-900 dark:text-white">{empresa.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{empresa.cuit}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        <PlanBadge plan={empresa.plan} />
      </td>
      <td className="px-5 py-3">
        <ModulosDots plan={empresa.plan} planes={planes} />
      </td>
      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
        {empresa.cantidadUsuarios ?? 0}
      </td>
      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
        {empresa.direccion ?? "—"}
      </td>
      <td className="px-5 py-3">
        <EstadoBadge isActive={empresa.isActive} />
      </td>
      <td className="px-5 py-3 text-right">
        <button
          type="button"
          onClick={() => onEdit(empresa)}
          aria-label={`Editar ${empresa.name}`}
          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}
