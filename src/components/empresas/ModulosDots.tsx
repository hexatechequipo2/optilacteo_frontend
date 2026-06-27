import type { EmpresaModulo, ModuloEnum } from "../../types/empresa.types";

const TODOS_LOS_MODULOS: ModuloEnum[] = [
  "usuarios",
  "reportes",
  "inventario",
  "produccion",
  "calidad",
];

interface ModulosDotsProps {
  modulos?: EmpresaModulo[];
}

export function ModulosDots({ modulos = [] }: ModulosDotsProps) {
  const activosSet = new Set(
    modulos.filter((m) => m.isActive).map((m) => m.modulo),
  );
  const activosCount = activosSet.size;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {TODOS_LOS_MODULOS.map((modulo) => (
          <span
            key={modulo}
            title={modulo}
            className={`h-2 w-2 rounded-full ${
              activosSet.has(modulo) ? "bg-blue-500" : "bg-slate-200"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-slate-400">{activosCount}/5</span>
    </div>
  );
}
