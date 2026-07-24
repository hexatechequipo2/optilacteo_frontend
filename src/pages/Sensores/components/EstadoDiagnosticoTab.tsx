import { Activity, Droplet, Gauge, Grid2x2, Radar, Target, Thermometer, type LucideIcon } from "lucide-react";
import { EstadoSensor } from "../../../types/sensor.types";

// ============================================================================
// EJEMPLO VISUAL — pendiente de implementación real.
// ============================================================================
// Esta pestaña todavía no lee datos reales: no hay módulo de mediciones IoT
// (HU-13) que alimente lecturas en vivo, así que por ahora solo se arma la
// estética con datos de ejemplo hardcodeados. Cuando ese módulo exista, esto
// se reemplaza por un hook (useDiagnosticoSensores o similar) que resuelva
// estado + última lectura por sensor real.
// ============================================================================

interface LecturaEjemplo {
  id: number;
  nombre: string;
  icon: LucideIcon;
  estado: EstadoSensor;
  valor: string | null;
  unidad?: string;
  parametroLabel: string;
  loteCodigo: string;
  hace: string;
}

const LECTURAS_EJEMPLO: LecturaEjemplo[] = [
  { id: 1, nombre: "Sensor pH — Línea 1", icon: Target, estado: EstadoSensor.FALLA, valor: null, parametroLabel: "pH", loteCodigo: "L-2026-2210", hace: "ahora" },
  { id: 2, nombre: "Sensor Temperatura — Pasteurizador", icon: Thermometer, estado: EstadoSensor.ACTIVO, valor: "4.3", unidad: "°C", parametroLabel: "Temperatura", loteCodigo: "L-2026-2210", hace: "hace 4 s" },
  { id: 3, nombre: "Densímetro — Recepción L1", icon: Grid2x2, estado: EstadoSensor.ACTIVO, valor: "1.031", unidad: "g/mL", parametroLabel: "Caudal", loteCodigo: "L-2026-2210", hace: "hace 6 s" },
  { id: 4, nombre: "Sensor Conductividad — CIP", icon: Radar, estado: EstadoSensor.FALLA, valor: null, parametroLabel: "Conductividad", loteCodigo: "L-2026-2210", hace: "hace 6 min" },
  { id: 5, nombre: "Sensor Grasa — Descremadora", icon: Droplet, estado: EstadoSensor.ACTIVO, valor: "34.8", unidad: "%", parametroLabel: "Caudal", loteCodigo: "L-2026-2211", hace: "hace 3 s" },
  { id: 6, nombre: "Sensor pH — Línea 2", icon: Target, estado: EstadoSensor.ACTIVO, valor: "6.52", parametroLabel: "pH", loteCodigo: "L-2026-2211", hace: "hace 5 s" },
  { id: 7, nombre: "Sensor Temperatura — Tanque suero", icon: Thermometer, estado: EstadoSensor.INACTIVO, valor: null, parametroLabel: "Temperatura", loteCodigo: "L-2026-2212", hace: "—" },
  { id: 8, nombre: "Sensor Acidez — Línea 3", icon: Activity, estado: EstadoSensor.ACTIVO, valor: "18.2", unidad: "°D", parametroLabel: "Acidez", loteCodigo: "L-2026-2212", hace: "hace 2 s" },
  { id: 9, nombre: "Sensor Proteínas — Línea 2", icon: Gauge, estado: EstadoSensor.FALLA, valor: null, parametroLabel: "Proteínas", loteCodigo: "L-2026-2211", hace: "hace 2 min" },
];

const ESTADO_LABEL: Record<EstadoSensor, string> = {
  [EstadoSensor.ACTIVO]: "Activo",
  [EstadoSensor.INACTIVO]: "Inactivo",
  [EstadoSensor.FALLA]: "Con falla",
};

const ESTADO_BADGE_CLASS: Record<EstadoSensor, string> = {
  [EstadoSensor.ACTIVO]: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  [EstadoSensor.INACTIVO]: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
  [EstadoSensor.FALLA]: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

const CARD_CLASS: Record<EstadoSensor, string> = {
  [EstadoSensor.ACTIVO]: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
  [EstadoSensor.INACTIVO]: "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
  [EstadoSensor.FALLA]: "border-red-200 bg-red-50/60 dark:border-red-500/30 dark:bg-red-500/5",
};

const activos = LECTURAS_EJEMPLO.filter((l) => l.estado === EstadoSensor.ACTIVO).length;
const conFalla = LECTURAS_EJEMPLO.filter((l) => l.estado === EstadoSensor.FALLA).length;
const inactivos = LECTURAS_EJEMPLO.filter((l) => l.estado === EstadoSensor.INACTIVO).length;
const conectados = activos + conFalla;

export function EstadoDiagnosticoTab() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-blue-50/60 to-transparent p-5 dark:border-slate-800 dark:from-blue-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Radar className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-slate-900 dark:text-white">
                Sensores IoT
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> EN VIVO
              </span>
            </div>
          </div>
          <span className="font-mono text-sm text-slate-500 dark:text-slate-400">
            {conectados} de {LECTURAS_EJEMPLO.length} conectados
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-500/15 dark:text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> {activos} activos
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-500/15 dark:text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> {conFalla} con falla
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            {inactivos} inactivos
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LECTURAS_EJEMPLO.map((lectura) => {
          const Icon = lectura.icon;
          return (
            <div
              key={lectura.id}
              className={`rounded-xl border p-4 ${CARD_CLASS[lectura.estado]}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                  <Icon className="h-4 w-4" />
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_BADGE_CLASS[lectura.estado]}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {ESTADO_LABEL[lectura.estado]}
                </span>
              </div>

              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {lectura.nombre}
              </p>

              <p className="my-2 text-2xl font-bold text-slate-900 dark:text-white">
                {lectura.valor ?? "—"}
                {lectura.valor && lectura.unidad && (
                  <span className="ml-1 text-sm font-medium text-slate-400 dark:text-slate-500">
                    {lectura.unidad}
                  </span>
                )}
              </p>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lectura.parametroLabel} · {lectura.loteCodigo} · {lectura.hace}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
