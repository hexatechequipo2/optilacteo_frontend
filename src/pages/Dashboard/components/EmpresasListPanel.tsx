import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { EmpresaType } from "../../../types/empresa.types";
import { EmpresaAvatar } from "../../../components/empresas/EmpresaAvatar";
import { PlanBadge } from "../../../components/empresas/PlanBadge";
import { EstadoBadge } from "../../../components/empresas/EstadoBadge";
import { ModulosDots } from "../../../components/empresas/ModulosDots";

const PAGE_SIZE = 5;

interface EmpresasListPanelProps {
  empresas: EmpresaType[];
}

export function EmpresasListPanel({ empresas }: EmpresasListPanelProps) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(empresas.length / PAGE_SIZE));
  const paginaActual = Math.min(page, totalPages - 1);

  const empresasPagina = useMemo(
    () =>
      empresas.slice(
        paginaActual * PAGE_SIZE,
        paginaActual * PAGE_SIZE + PAGE_SIZE,
      ),
    [empresas, paginaActual],
  );

  const hasta = Math.min(empresas.length, paginaActual * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Listado de empresas
        </h2>
        <button
          type="button"
          onClick={() => navigate("/empresas")}
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          Ver todas →
        </button>
      </div>

      {empresas.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          No hay empresas registradas.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {empresasPagina.map((empresa) => (
            <li
              key={empresa.id}
              className="flex flex-wrap items-center gap-3 px-5 py-4"
            >
              <EmpresaAvatar nombre={empresa.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                  {empresa.name}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {empresa.direccion ?? "Sin ubicación"}
                </p>
                <div className="mt-1.5">
                  <ModulosDots modulos={empresa.modulos} />
                </div>
              </div>
              <PlanBadge plan={empresa.plan} />
              <EstadoBadge isActive={empresa.isActive} />
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <span>
          {hasta} / {empresas.length}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Página anterior"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={paginaActual === 0}
            className="rounded-md border border-slate-200 p-1 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span>
            {paginaActual + 1} de {totalPages}
          </span>
          <button
            type="button"
            aria-label="Página siguiente"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={paginaActual >= totalPages - 1}
            className="rounded-md border border-slate-200 p-1 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}