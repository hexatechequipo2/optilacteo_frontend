import {
  Users,
  Radio,
  LayoutDashboard,
  Package,
  Sparkles,
  Activity,
  Gauge,
  GitMerge,
  BarChart2,
  Mic,
  type LucideIcon,
} from "lucide-react";
import type { Plan, PlanModulo } from "../../types/plan.types";

const TODOS_LOS_MODULOS: { nombre: string; icono: LucideIcon }[] = [
  { nombre: "Dashboard", icono: LayoutDashboard },
  { nombre: "Recepción", icono: Package },
  { nombre: "Destino productivo (IA)", icono: Sparkles },
  { nombre: "Monitoreo y alertas", icono: Activity },
  { nombre: "Sensores IoT", icono: Gauge },
  { nombre: "Trazabilidad", icono: GitMerge },
  { nombre: "Reportes y forecast", icono: BarChart2 },
  { nombre: "Asistente de voz", icono: Mic },
];

function topBorderClass(nombre: string): string {
  const lower = nombre.toLowerCase();
  if (lower === "pro") return "border-t-[3px] border-t-blue-600 shadow-lg";
  if (lower === "enterprise") return "border-t-[3px] border-t-blue-500";
  return "border-t-[3px] border-t-slate-300";
}

function formatMrr(mrr: number): string {
  return `${mrr.toFixed(1)}k`;
}

interface PlanCardProps {
  plan: Plan;
}

export function PlanCard({ plan }: PlanCardProps) {
  const modulosHabilitados = new Set(
    plan.modulos.map((m: PlanModulo) => m.nombre),
  );

  return (
    <div
      className={`flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 ${topBorderClass(plan.nombre)}`}
    >
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">{plan.nombre}</h2>
      </div>

      {/* Precio */}
      <div className="flex items-baseline gap-1">
        <span className="text-sm text-slate-500">US$</span>
        <span className="text-4xl font-bold text-slate-900">{plan.precio}</span>
        <span className="text-sm text-slate-500">/mes</span>
      </div>

      {/* Stats chip */}
      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
        <div>
          <p className="text-2xl font-bold text-slate-900">
            {plan.empresasAsignadas}
          </p>
          <p className="text-xs text-slate-500">
            {plan.empresasAsignadas === 1 ? "empresa" : "empresas"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">
            US${" "}
            <span className="text-lg font-bold text-slate-900">
              {formatMrr(plan.mrr)}
            </span>
          </p>
          <p className="text-xs text-slate-500">MRR</p>
        </div>
      </div>

      {/* Límites */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Users className="h-4 w-4 flex-shrink-0 text-slate-400" />
          <span>
            Hasta <strong>{plan.maxUsuarios}</strong> usuarios
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Radio className="h-4 w-4 flex-shrink-0 text-slate-400" />
          <span>
            Hasta <strong>{plan.maxSensores}</strong> sensores
          </span>
        </div>
      </div>

      {/* Módulos */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {plan.modulos.length} de 8 módulos
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TODOS_LOS_MODULOS.map(({ nombre, icono: Icon }) => {
            const enabled = modulosHabilitados.has(nombre);
            return (
              <span
                key={nombre}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  enabled
                    ? "bg-blue-50 text-blue-700"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                <Icon className="h-3 w-3" />
                {nombre}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
