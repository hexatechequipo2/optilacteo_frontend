import type { EmpresaModulo, ModuloEnum } from "../../types/empresa.types";

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
  modulos: EmpresaModulo[] | undefined;
}

export function ModulosDots({ modulos }: ModulosDotsProps) {
  const modulosActivos = new Set(
    (modulos ?? []).filter((m) => m.isActive).map((m) => m.modulo),
  );

  const activosCount = modulosActivos.size;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {TODOS_LOS_MODULOS.map((modulo) => (
          <span
            key={modulo}
            title={modulo}
            className={`h-2 w-2 rounded-full ${
              modulosActivos.has(modulo) ? "bg-blue-500" : "bg-slate-200 dark:bg-slate-700"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-slate-400 dark:text-slate-500">{activosCount}/8</span>
    </div>
  );
}