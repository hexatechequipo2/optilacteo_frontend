import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Droplet,
  Gauge,
  Grid2x2,
  Mic,
  Radar,
  Target,
  Thermometer,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Parametro, TipoMateriaPrima } from "../../../types/configParametro.types";
import { PARAMETRO_LABEL, UNIDAD_POR_PARAMETRO } from "../constants/parametroSensor";

// HU-40 (Sprint 5, mock visual): "Indicadores semáforo en tiempo real" para
// Operario de línea. A pedido explícito de la tarea, esta pantalla NO se
// conecta a ningún endpoint real todavía (el backend no está desarrollado
// para esta fecha) — todos los lotes, lecturas y umbrales de acá son datos
// de ejemplo fijos, solo para validar que el visual coincide con el
// prototipo del documento inicial de Sprint 5. Cuando el backend exista,
// esto se reemplaza por un hook real (mismo criterio que useSensoresRealtime
// en EstadoDiagnosticoTab), pero la forma de LoteEnProcesoMock/LecturaSemaforo
// ya se pensó parecida a lo que se espera del back para que ese cambio sea
// más chico.

type EstadoSemaforo = "verde" | "amarillo" | "rojo";

interface LecturaSemaforo {
  parametro: Parametro;
  valor: number;
  estado: EstadoSemaforo;
}

interface LoteEnProcesoMock {
  id: string;
  codigo: string;
  linea: string;
  materiaPrima: TipoMateriaPrima;
  lecturas: LecturaSemaforo[];
}

const PARAMETRO_ICON: Record<Parametro, LucideIcon> = {
  [Parametro.PH]: Target,
  [Parametro.TEMPERATURA]: Thermometer,
  [Parametro.DENSIDAD]: Grid2x2,
  [Parametro.GRASA]: Droplet,
  [Parametro.PROTEINA]: Gauge,
  [Parametro.ACIDEZ]: Activity,
  [Parametro.CONDUCTIVIDAD]: Radar,
};

const MATERIA_PRIMA_LABEL: Record<TipoMateriaPrima, string> = {
  [TipoMateriaPrima.LECHE_CRUDA]: "Leche cruda",
  [TipoMateriaPrima.CREMA_DE_LECHE]: "Crema de leche",
  [TipoMateriaPrima.MASA_HILADA]: "Masa hilada",
};

const ESTADO_SEMAFORO_META: Record<
  EstadoSemaforo,
  { label: string; icon: LucideIcon; cardClass: string; chipClass: string }
> = {
  verde: {
    label: "En rango",
    icon: CheckCircle2,
    cardClass: "border-green-200 bg-green-50 dark:border-green-500/30 dark:bg-green-500/10",
    chipClass: "text-green-700 dark:text-green-400",
  },
  amarillo: {
    label: "En límite",
    icon: AlertTriangle,
    cardClass: "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10",
    chipClass: "text-amber-700 dark:text-amber-400",
  },
  rojo: {
    label: "Fuera de rango",
    icon: XCircle,
    cardClass: "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10",
    chipClass: "text-red-700 dark:text-red-400",
  },
};

// Ejemplo fijo, pensado para calzar con el prototipo del documento de
// Sprint 5: 5 lotes en proceso repartidos en 3 líneas, con una mezcla de
// verde/amarillo/rojo para que el semáforo se vea representado por completo.
const LOTES_MOCK: LoteEnProcesoMock[] = [
  {
    id: "L-2026-2210",
    codigo: "L-2026-2210",
    linea: "Línea 1",
    materiaPrima: TipoMateriaPrima.LECHE_CRUDA,
    lecturas: [
      { parametro: Parametro.TEMPERATURA, valor: 5.65, estado: "amarillo" },
      { parametro: Parametro.PH, valor: 6.61, estado: "amarillo" },
      { parametro: Parametro.ACIDEZ, valor: 0.13, estado: "rojo" },
      { parametro: Parametro.GRASA, valor: 5.07, estado: "verde" },
      { parametro: Parametro.PROTEINA, valor: 3.81, estado: "rojo" },
      { parametro: Parametro.DENSIDAD, valor: 1.031, estado: "verde" },
      { parametro: Parametro.CONDUCTIVIDAD, valor: 3.99, estado: "rojo" },
    ],
  },
  {
    id: "L-2026-2211",
    codigo: "L-2026-2211",
    linea: "Línea 2",
    materiaPrima: TipoMateriaPrima.CREMA_DE_LECHE,
    lecturas: [
      { parametro: Parametro.TEMPERATURA, valor: 4.2, estado: "verde" },
      { parametro: Parametro.PH, valor: 6.45, estado: "verde" },
      { parametro: Parametro.ACIDEZ, valor: 0.16, estado: "verde" },
      { parametro: Parametro.GRASA, valor: 32.4, estado: "amarillo" },
      { parametro: Parametro.PROTEINA, valor: 2.3, estado: "verde" },
      { parametro: Parametro.DENSIDAD, valor: 1.012, estado: "verde" },
      { parametro: Parametro.CONDUCTIVIDAD, valor: 4.5, estado: "verde" },
    ],
  },
  {
    id: "L-2026-2212",
    codigo: "L-2026-2212",
    linea: "Línea 3",
    materiaPrima: TipoMateriaPrima.MASA_HILADA,
    lecturas: [
      { parametro: Parametro.TEMPERATURA, valor: 7.8, estado: "rojo" },
      { parametro: Parametro.PH, valor: 5.2, estado: "amarillo" },
      { parametro: Parametro.ACIDEZ, valor: 0.2, estado: "amarillo" },
      { parametro: Parametro.GRASA, valor: 22.1, estado: "verde" },
      { parametro: Parametro.PROTEINA, valor: 18.6, estado: "verde" },
      { parametro: Parametro.DENSIDAD, valor: 1.045, estado: "verde" },
      { parametro: Parametro.CONDUCTIVIDAD, valor: 5.1, estado: "amarillo" },
    ],
  },
  {
    id: "L-2026-2213",
    codigo: "L-2026-2213",
    linea: "Línea 1",
    materiaPrima: TipoMateriaPrima.LECHE_CRUDA,
    lecturas: [
      { parametro: Parametro.TEMPERATURA, valor: 3.9, estado: "verde" },
      { parametro: Parametro.PH, valor: 6.72, estado: "verde" },
      { parametro: Parametro.ACIDEZ, valor: 0.17, estado: "verde" },
      { parametro: Parametro.GRASA, valor: 3.6, estado: "verde" },
      { parametro: Parametro.PROTEINA, valor: 3.2, estado: "verde" },
      { parametro: Parametro.DENSIDAD, valor: 1.03, estado: "verde" },
      { parametro: Parametro.CONDUCTIVIDAD, valor: 4.8, estado: "verde" },
    ],
  },
  {
    id: "L-2026-2214",
    codigo: "L-2026-2214",
    linea: "Línea 2",
    materiaPrima: TipoMateriaPrima.LECHE_CRUDA,
    lecturas: [
      { parametro: Parametro.TEMPERATURA, valor: 6.4, estado: "amarillo" },
      { parametro: Parametro.PH, valor: 6.3, estado: "amarillo" },
      { parametro: Parametro.ACIDEZ, valor: 0.19, estado: "verde" },
      { parametro: Parametro.GRASA, valor: 2.8, estado: "rojo" },
      { parametro: Parametro.PROTEINA, valor: 3.0, estado: "verde" },
      { parametro: Parametro.DENSIDAD, valor: 1.027, estado: "verde" },
      { parametro: Parametro.CONDUCTIVIDAD, valor: 3.6, estado: "amarillo" },
    ],
  },
];

function formatearValor(valor: number, parametro: Parametro): string {
  // Mismo criterio de decimales que se ve en el prototipo: pH/temperatura/
  // proteína/grasa/conductividad con 2 decimales, densidad con 3 y acidez
  // con 2 (todos los valores acá son de ejemplo, no vienen de un sensor real).
  const decimales = parametro === Parametro.DENSIDAD ? 3 : 2;
  return valor.toFixed(decimales);
}

export function MonitoreoSemaforoTab() {
  const [loteSeleccionadoId, setLoteSeleccionadoId] = useState(LOTES_MOCK[0].id);
  const loteActivo =
    LOTES_MOCK.find((l) => l.id === loteSeleccionadoId) ?? LOTES_MOCK[0];

  // Solo para que la hora mostrada en cada card no quede "congelada": no
  // representa una lectura nueva real, es puramente cosmético mientras no
  // haya backend (ver comentario de arriba).
  const [horaMock, setHoraMock] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setHoraMock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  const horaFormateada = horaMock.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-blue-50/60 to-transparent p-5 dark:border-slate-800 dark:from-blue-500/5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Radar className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-slate-900 dark:text-white">
                Monitoreo en línea
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> EN VIVO
              </span>
            </div>
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Lote activo <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{loteActivo.codigo}</span>{" "}
            · {loteActivo.linea}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-2">
          {LOTES_MOCK.map((lote) => (
            <button
              key={lote.id}
              type="button"
              onClick={() => setLoteSeleccionadoId(lote.id)}
              className={`flex-shrink-0 rounded-lg border px-4 py-2 text-left text-sm transition ${
                lote.id === loteSeleccionadoId
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-500/10 dark:text-blue-400"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700"
              }`}
            >
              <p className="font-semibold">{lote.codigo}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {lote.linea} · {MATERIA_PRIMA_LABEL[lote.materiaPrima]}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loteActivo.lecturas.map((lectura) => {
          const Icon = PARAMETRO_ICON[lectura.parametro];
          const meta = ESTADO_SEMAFORO_META[lectura.estado];
          const EstadoIcon = meta.icon;
          const unidad = UNIDAD_POR_PARAMETRO[lectura.parametro];

          return (
            <div
              key={lectura.parametro}
              className={`rounded-xl border p-4 ${meta.cardClass}`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/70 text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
                  <Icon className="h-4 w-4" />
                </div>
                <span className={`flex items-center gap-1 text-xs font-semibold ${meta.chipClass}`}>
                  <EstadoIcon className="h-3.5 w-3.5" /> {meta.label}
                </span>
              </div>

              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {PARAMETRO_LABEL[lectura.parametro]}
              </p>

              <p className="my-1 text-2xl font-bold text-slate-900 dark:text-white">
                {formatearValor(lectura.valor, lectura.parametro)}
                {unidad && (
                  <span className="ml-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {unidad}
                  </span>
                )}
              </p>

              <p className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                <Clock className="h-3 w-3" /> {horaFormateada}
              </p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            Historial de cargas manuales · {loteActivo.codigo}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">0 registros esta sesión</span>
        </div>
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <Mic className="h-4 w-4" />
          </span>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Sin cargas manuales aún
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Los ingresos manuales del turno aparecerán acá.
          </p>
        </div>
      </div>
    </div>
  );
}
