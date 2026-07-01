import type { ModuloEnum } from "../../types/empresa.types";
import type { Plan } from "../../types/plan.types";

const TODOS_LOS_MODULOS: ModuloEnum[] = [
  "dashboard",
  "recepcion",
  "destino_productivo_ia",
  "monitoreo_alertas",
  "sensores_iot",
  "trazabilidad",
  "reportes_forecast",
  "asistente_voz",
];

interface ModulosDotsProps {
  plan: string;
  planes: Plan[];
}

export function ModulosDots({ plan, planes }: ModulosDotsProps) {
  const planDeLaEmpresa = planes.find(
    (p) => p.nombre.toLowerCase() === plan.toLowerCase(),
  );
  const modulosDelPlan = new Set(
    planDeLaEmpresa?.modulos.map((m) => m.codigo) ?? [],
  );
  const activosCount = modulosDelPlan.size;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {TODOS_LOS_MODULOS.map((modulo) => (
          <span
            key={modulo}
            title={modulo}
            className={`h-2 w-2 rounded-full ${
              modulosDelPlan.has(modulo) ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-700"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-slate-400 dark:text-slate-500">{activosCount}/8</span>
    </div>
  );
}
