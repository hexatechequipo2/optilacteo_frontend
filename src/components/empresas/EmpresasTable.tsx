import type { EmpresaType } from "../../types/empresa.types";
import { EmpresaRow } from "./EmpresaRow";

const HEADERS = [
  "EMPRESA",
  "PLAN",
  "MÓDULOS",
  "USUARIOS",
  "UBICACIÓN",
  "ESTADO",
  "",
];

interface EmpresasTableProps {
  empresas: EmpresaType[];
  onEdit: (empresa: EmpresaType) => void;
}

export function EmpresasTable({ empresas, onEdit }: EmpresasTableProps) {
  if (empresas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-base font-medium text-slate-700 dark:text-slate-300">
          No se encontraron empresas
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Probá ajustar la búsqueda o el filtro de estado.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800">
            {HEADERS.map((header, index) => (
              <th
                key={`${header}-${index}`}
                className="px-5 py-3 text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {empresas.map((empresa) => (
            <EmpresaRow
              key={empresa.id}
              empresa={empresa}
              onEdit={onEdit}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}