import { useMemo } from "react";
import { ListChecks } from "lucide-react";
import type { Parametro } from "../../../types/configParametro.types";
import type { AlertaNotificacion } from "../../../types/notificacion.types";
import { NivelAlerta } from "../../../types/notificacion.types";
import { NIVEL_ALERTA_META, PARAMETRO_LABEL, UNIDAD_POR_PARAMETRO } from "../constants/alertas.constants";
import { TIPO_MATERIA_PRIMA_TABS } from "../../Configuracion/constants/parametrosCalidad";

const MATERIA_PRIMA_LABEL = new Map(TIPO_MATERIA_PRIMA_TABS.map((t) => [t.value, t.label]));

interface ReglaVista {
  key: string;
  parametro: Parametro;
  materiaPrimaLabel: string;
  umbralMin: number;
  umbralMax: number;
}

interface ReglasActivasPanelProps {
  alertas: AlertaNotificacion[];
}

// Panel lateral "Reglas activas" del prototipo (Figura 1, Sprint 3): resumen
// de qué condición dispara cada alerta.
// TODO(backend): GET /config-parametros (los umbrales configurados de
// verdad, HU-09) es @Roles(GERENTE) — Responsable de producción, que es
// quien ve esta pantalla, no puede leerlo. Mientras no haya un endpoint de
// solo lectura habilitado para ese rol, este panel muestra los umbrales tal
// como llegan en las alertas ya recibidas (data.umbralMin/umbralMax de cada
// notificación), no el catálogo completo de reglas configuradas.
export function ReglasActivasPanel({ alertas }: ReglasActivasPanelProps) {
  const reglas = useMemo(() => {
    const porClave = new Map<string, ReglaVista>();
    for (const alerta of alertas) {
      const { parametro, materiaPrima, umbralMin, umbralMax } = alerta.data;
      const key = `${parametro}-${materiaPrima}`;
      if (!porClave.has(key)) {
        porClave.set(key, {
          key,
          parametro,
          materiaPrimaLabel: MATERIA_PRIMA_LABEL.get(materiaPrima) ?? materiaPrima,
          umbralMin,
          umbralMax,
        });
      }
    }
    return Array.from(porClave.values()).sort((a, b) =>
      PARAMETRO_LABEL[a.parametro].localeCompare(PARAMETRO_LABEL[b.parametro]),
    );
  }, [alertas]);

  return (
    <aside className="flex w-full flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 lg:w-80 lg:flex-shrink-0 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-slate-400 dark:text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Reglas activas</h2>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Una alerta se genera cuando un valor registrado queda fuera del umbral configurado para su
        parámetro y materia prima. El nivel depende de qué tan lejos del umbral cae el desvío:
      </p>

      <ul className="flex flex-col gap-1.5 text-xs">
        {(
          [
            [NivelAlerta.INFORMATIVA, "hasta 5% de desvío"],
            [NivelAlerta.ADVERTENCIA, "5%–15% de desvío"],
            [NivelAlerta.CRITICA, "15% de desvío o más"],
          ] as const
        ).map(([nivel, descripcion]) => {
          const meta = NIVEL_ALERTA_META[nivel];
          const Icon = meta.icon;
          return (
            <li key={nivel} className="flex items-center gap-2">
              <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${meta.iconClassName}`} />
              <span className="text-slate-600 dark:text-slate-300">
                <span className="font-medium">{meta.label}:</span> {descripcion}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Umbrales vistos en alertas recientes
        </p>
        {reglas.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Todavía no se registraron alertas — los parámetros van a aparecer acá a medida que se
            generen.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {reglas.map((regla) => {
              const unidad = UNIDAD_POR_PARAMETRO[regla.parametro];
              return (
                <li key={regla.key} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-300">
                    {PARAMETRO_LABEL[regla.parametro]}{" "}
                    <span className="text-slate-400 dark:text-slate-500">({regla.materiaPrimaLabel})</span>
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {regla.umbralMin}–{regla.umbralMax}
                    {unidad ? ` ${unidad}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
