import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock,
  Droplet,
  Gauge,
  Grid2x2,
  Mic,
  MinusCircle,
  Radar,
  RefreshCw,
  Target,
  Thermometer,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Parametro, TipoMateriaPrima } from "../../../types/configParametro.types";
import { EstadoSemaforo, type LoteEnProceso } from "../../../types/monitoreoSemaforo.types";
import { useMonitoreoSemaforo } from "../../../hooks/useMonitoreoSemaforo";
import { useConfigParametros } from "../../../hooks/useConfigParametros";
import { useHistorialMedicionManual } from "../../../hooks/useHistorialMedicionManual";
import { normalizarEstadoSemaforo } from "../../../utils/estadoSemaforo";
import {
  PARAMETRO_LABEL,
  UBICACION_LABEL,
  UNIDAD_POR_PARAMETRO,
} from "../constants/parametroSensor";

// HU-40: "Indicadores semáforo en tiempo real" para Operario de línea.
// Lotes en proceso y estado inicial por parámetro por REST, y
// actualizaciones en vivo por el WS /sensores (ver useMonitoreoSemaforo).
// El estado lo calcula el backend (SemaforoService); acá solo se representa
// con color + ícono + etiqueta, para que se lea sin mirar el número.

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

// Estado de UI local (no viene del backend): parámetro sin ninguna lectura
// para el lote. Distinto de SIN_UMBRAL_CONFIGURADO, que sí tiene lectura.
const SIN_LECTURAS = "SIN_LECTURAS" as const;
type EstadoCardSemaforo = EstadoSemaforo | typeof SIN_LECTURAS;

// Siempre las 7 cards, en el orden de Parametro, para que no salten.
const ORDEN_PARAMETROS = Object.values(Parametro);

const ESTADO_SEMAFORO_META: Record<
  EstadoCardSemaforo,
  { label: string; icon: LucideIcon; cardClass: string; chipClass: string }
> = {
  [EstadoSemaforo.NORMAL]: {
    label: "En rango",
    icon: CheckCircle2,
    cardClass: "border-green-200 bg-green-50 dark:border-green-500/30 dark:bg-green-500/10",
    chipClass: "text-green-700 dark:text-green-400",
  },
  [EstadoSemaforo.EN_LIMITE]: {
    label: "En límite",
    icon: AlertTriangle,
    cardClass: "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10",
    chipClass: "text-amber-700 dark:text-amber-400",
  },
  [EstadoSemaforo.FUERA_DE_RANGO]: {
    label: "Fuera de rango",
    icon: XCircle,
    cardClass: "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10",
    chipClass: "text-red-700 dark:text-red-400",
  },
  [EstadoSemaforo.SIN_UMBRAL_CONFIGURADO]: {
    label: "Sin umbral",
    icon: MinusCircle,
    cardClass: "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40",
    chipClass: "text-slate-600 dark:text-slate-400",
  },
  [SIN_LECTURAS]: {
    label: "Sin lecturas",
    icon: CircleDashed,
    cardClass: "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40",
    chipClass: "text-slate-500 dark:text-slate-400",
  },
};

function formatearValor(valor: number, parametro: Parametro): string {
  // Densidad con 3 decimales, el resto con 2 (mismo criterio del prototipo).
  const decimales = parametro === Parametro.DENSIDAD ? 3 : 2;
  return valor.toFixed(decimales);
}

// Una lectura con más de este tiempo se marca como "antigua" (texto ámbar).
// No cambia el color del semáforo: ese estado lo define el backend.
const HORAS_LECTURA_ANTIGUA = 2;
const UMBRAL_LECTURA_ANTIGUA_MS = HORAS_LECTURA_ANTIGUA * 60 * 60 * 1000;

function esMismoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dosDigitos(n: number): string {
  return String(n).padStart(2, "0");
}

// Hoy: solo la hora ("16:15:42"). Otro día: fecha + hora ("24/09 16:15"),
// con año si no es el actual ("24/09/2025 16:15"), para no presentar como
// actual una lectura vieja. Se arma a mano en 24 h: toLocale*("es-AR") en
// Chromium da "24/9" y "04:15 p. m." (12 h), según el ICU del navegador.
function formatearMomentoLectura(iso: string, ahora: Date): string {
  const fecha = new Date(iso);
  const hora = `${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
  if (esMismoDia(fecha, ahora)) {
    return `${hora}:${dosDigitos(fecha.getSeconds())}`;
  }
  const dia = `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}`;
  const anio = fecha.getFullYear() !== ahora.getFullYear() ? `/${fecha.getFullYear()}` : "";
  return `${dia}${anio} ${hora}`;
}

function esLecturaAntigua(iso: string, ahora: Date): boolean {
  return ahora.getTime() - new Date(iso).getTime() > UMBRAL_LECTURA_ANTIGUA_MS;
}

// Reloj de la pestaña: sin lecturas nuevas, una card igual tiene que pasar a
// "antigua" (y cambiar a fecha + hora al pasar la medianoche).
function useAhora(intervaloMs = 60_000): Date {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), intervaloMs);
    return () => clearInterval(id);
  }, [intervaloMs]);
  return ahora;
}

function ubicacionLabel(lote: LoteEnProceso): string {
  return lote.ubicacionInicial ? UBICACION_LABEL[lote.ubicacionInicial] : "Sin ubicación";
}

function BotonReintentar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <RefreshCw className="h-3.5 w-3.5" /> Reintentar
    </button>
  );
}

function PanelMensaje({
  titulo,
  detalle,
  onReintentar,
}: {
  titulo: string;
  detalle?: string;
  onReintentar?: () => void;
}) {
  return (
    <div
      role={onReintentar ? "alert" : undefined}
      className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white py-10 text-center dark:border-slate-800 dark:bg-slate-900"
    >
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{titulo}</p>
      {detalle && <p className="text-xs text-slate-400 dark:text-slate-500">{detalle}</p>}
      {onReintentar && <BotonReintentar onClick={onReintentar} />}
    </div>
  );
}

function HistorialCargasManuales({ lote }: { lote: LoteEnProceso }) {
  // GET /lotes/:id/mediciones-manuales (HU-20), primera página (más nuevas
  // primero). El hook ya refetchea cuando cambia el lote.
  const { items, meta, isLoading, error, refetch } = useHistorialMedicionManual(lote.id, {});
  const ahora = useAhora();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900 dark:text-white">
          Historial de cargas manuales · {lote.codigo}
        </span>
        {!isLoading && !error && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {meta.total} {meta.total === 1 ? "registro" : "registros"}
            {meta.total > items.length && ` · mostrando los últimos ${items.length}`}
          </span>
        )}
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          Cargando cargas manuales…
        </p>
      ) : error ? (
        <div role="alert" className="flex flex-col items-center gap-1 py-8 text-center">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{error}</p>
          <BotonReintentar onClick={() => void refetch()} />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
            <Mic className="h-4 w-4" />
          </span>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Sin cargas manuales aún
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Los ingresos manuales de este lote aparecerán acá.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => {
            const estadoMeta = ESTADO_SEMAFORO_META[normalizarEstadoSemaforo(item.estado)];
            const EstadoIcon = estadoMeta.icon;
            const unidad = UNIDAD_POR_PARAMETRO[item.parametro];
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm"
              >
                <span className="min-w-[8rem] text-slate-700 dark:text-slate-300">
                  {PARAMETRO_LABEL[item.parametro]}
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatearValor(item.valor, item.parametro)}
                  {unidad && (
                    <span className="ml-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      {unidad}
                    </span>
                  )}
                </span>
                <span
                  className={`flex items-center gap-1 text-xs font-semibold ${estadoMeta.chipClass}`}
                >
                  <EstadoIcon className="h-3.5 w-3.5" /> {estadoMeta.label}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                  <Clock className="h-3 w-3" /> {formatearMomentoLectura(item.createdAt, ahora)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function MonitoreoSemaforoTab() {
  const {
    lotes,
    loteSeleccionado,
    seleccionarLote,
    lecturas,
    isLoading,
    error,
    reintentar,
    isLoadingLecturas,
    errorLecturas,
    reintentarLecturas,
    isRealtimeConnected,
  } = useMonitoreoSemaforo();
  const ahora = useAhora();
  // Solo como referencia para el operario: el estado de cada card lo sigue
  // calculando el backend. Si la carga falla, la línea simplemente no se muestra.
  const { configs } = useConfigParametros();

  const hayLecturas = Object.keys(lecturas).length > 0;

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
              {isRealtimeConnected && (
                <span className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> EN VIVO
                </span>
              )}
            </div>
          </div>
          {loteSeleccionado && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Lote activo{" "}
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                {loteSeleccionado.codigo}
              </span>{" "}
              · {ubicacionLabel(loteSeleccionado)}
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <PanelMensaje titulo="Cargando lotes en proceso…" />
      ) : error ? (
        <PanelMensaje titulo={error} onReintentar={reintentar} />
      ) : !loteSeleccionado ? (
        <PanelMensaje
          titulo="No hay lotes en proceso"
          detalle="Cuando un lote pase a estado en proceso, sus indicadores van a aparecer acá."
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="flex gap-2">
              {lotes.map((lote) => (
                <button
                  key={lote.id}
                  type="button"
                  onClick={() => seleccionarLote(lote.id)}
                  aria-pressed={lote.id === loteSeleccionado.id}
                  className={`flex-shrink-0 rounded-lg border px-4 py-2 text-left text-sm transition ${
                    lote.id === loteSeleccionado.id
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-500/10 dark:text-blue-400"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700"
                  }`}
                >
                  <p className="font-semibold">{lote.codigo}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {ubicacionLabel(lote)} · {MATERIA_PRIMA_LABEL[lote.materiaPrima]}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {hayLecturas && errorLecturas && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
            >
              {errorLecturas} Se muestran las últimas lecturas recibidas en vivo.
              <button
                type="button"
                onClick={reintentarLecturas}
                className="font-semibold underline"
              >
                Reintentar
              </button>
            </div>
          )}

          {!hayLecturas && isLoadingLecturas ? (
            <PanelMensaje titulo="Cargando indicadores del lote…" />
          ) : !hayLecturas && errorLecturas ? (
            <PanelMensaje titulo={errorLecturas} onReintentar={reintentarLecturas} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ORDEN_PARAMETROS.map((parametro) => {
                const lectura = lecturas[parametro];
                const Icon = PARAMETRO_ICON[parametro];
                const meta = ESTADO_SEMAFORO_META[lectura?.estado ?? SIN_LECTURAS];
                const EstadoIcon = meta.icon;
                const unidad = UNIDAD_POR_PARAMETRO[parametro];
                const config = configs.find(
                  (c) => c.parametro === parametro && c.tipoMateriaPrima === loteSeleccionado.materiaPrima,
                );

                return (
                  <div
                    key={parametro}
                    role="group"
                    aria-label={`${PARAMETRO_LABEL[parametro]}: ${meta.label}`}
                    className={`rounded-xl border p-4 ${meta.cardClass}`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/70 text-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span
                        className={`flex items-center gap-1 text-xs font-semibold ${meta.chipClass}`}
                      >
                        <EstadoIcon className="h-3.5 w-3.5" /> {meta.label}
                      </span>
                    </div>

                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {PARAMETRO_LABEL[parametro]}
                    </p>

                    {lectura && (
                      <>
                        <p className="my-1 text-2xl font-bold text-slate-900 dark:text-white">
                          {formatearValor(lectura.valor, parametro)}
                          {unidad && (
                            <span className="ml-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                              {unidad}
                            </span>
                          )}
                        </p>

                        <p className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                          <Clock className="h-3 w-3" />{" "}
                          {formatearMomentoLectura(lectura.timestamp, ahora)}
                          {lectura.origen === "MANUAL" && " · Carga manual"}
                        </p>
                        {esLecturaAntigua(lectura.timestamp, ahora) && (
                          <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                            Lectura antigua (más de {HORAS_LECTURA_ANTIGUA} h)
                          </p>
                        )}
                      </>
                    )}

                    {config && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {`Normal ${config.umbralMin}–${config.umbralMax}`}
                        {/* Defensivo: un backend sin el fix de HU-40 no devuelve las bandas. */}
                        {config.umbralAlertaMin != null &&
                          config.umbralAlertaMax != null &&
                          ` · alerta ${config.umbralAlertaMin}–${config.umbralAlertaMax}`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <HistorialCargasManuales lote={loteSeleccionado} />
        </>
      )}
    </div>
  );
}
