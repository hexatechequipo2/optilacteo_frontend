import { NivelAlerta } from "../../../types/notificacion.types";
import { NIVEL_ALERTA_META } from "../constants/alertas.constants";

interface ContadoresAlertasProps {
  criticas: number;
  advertencias: number;
  informativas: number;
}

// AC2 + estructura del prototipo (Figura 1, Sprint 3): 3 contadores
// destacados, uno por nivel, cada uno con su ícono y el conteo actual.
// TODO: conectar al endpoint de alertas — hoy estos conteos se calculan en
// AlertasPage a partir del array mock (filtrado por lote/fecha/abiertas),
// el día de mañana probablemente vengan directo de un GET /alertas/resumen.
export function ContadoresAlertas({ criticas, advertencias, informativas }: ContadoresAlertasProps) {
  const items: { nivel: NivelAlerta; valor: number; label: string }[] = [
    { nivel: NivelAlerta.CRITICA, valor: criticas, label: "Críticas" },
    { nivel: NivelAlerta.ADVERTENCIA, valor: advertencias, label: "Preventivas" },
    { nivel: NivelAlerta.INFORMATIVA, valor: informativas, label: "Informativas" },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map(({ nivel, valor, label }) => {
        const meta = NIVEL_ALERTA_META[nivel];
        const Icon = meta.icon;

        return (
          <div
            key={nivel}
            className={`flex items-center gap-4 rounded-xl border p-4 sm:p-5 ${meta.className}`}
          >
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-white/70 dark:bg-slate-900/40">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-bold sm:text-3xl">{valor}</p>
              <p className="truncate text-xs font-semibold uppercase tracking-wide opacity-80">
                {label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
