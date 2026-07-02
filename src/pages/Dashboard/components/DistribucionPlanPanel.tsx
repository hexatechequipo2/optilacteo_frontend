import type { PlanDistribucion } from "../../../hooks/useDashboard";

interface DistribucionPlanPanelProps {
  distribucion: PlanDistribucion[];
}

export function DistribucionPlanPanel({ distribucion }: DistribucionPlanPanelProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">
        Distribución por plan
      </h2>

      {distribucion.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No hay planes registrados.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {distribucion.map((plan) => (
            <li key={plan.id}>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-medium text-slate-900 dark:text-white">
                  {plan.nombre}
                </span>
                <span className="flex-shrink-0 text-slate-500 dark:text-slate-400">
                  US$ {plan.precio}
                </span>
              </div>
              <div className="mb-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${plan.porcentaje}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {plan.empresasAsignadas}{" "}
                {plan.empresasAsignadas === 1 ? "empresa" : "empresas"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
