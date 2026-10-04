import { useId } from "react";
import { Archive, ClipboardCheck, Lock, PowerOff, type LucideIcon } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import {
  claveRegistro,
  type RegistroRetencionEvaluado,
} from "../../../hooks/useRetencion";
import {
  AccionVencimiento,
  ClasificacionRetencion,
  EstadoRegistroRetencion,
  type PoliticaRetencion,
} from "../../../types/retencion.types";
import { parsearFechaLocal } from "../../../utils/retencion";
import {
  ACCION_VENCIMIENTO_META,
  ENTIDAD_RETENIBLE_META,
  ESTADO_REGISTRO_META,
} from "../constants/retencion";

interface RegistrosProximosVencerTablaProps {
  registros: RegistroRetencionEvaluado[];
  politica: PoliticaRetencion;
  procesandoClave: string | null;
  onAplicarPolitica: (registro: RegistroRetencionEvaluado) => void;
  onDarDeBaja: (registro: RegistroRetencionEvaluado) => void;
  // Sin configuracion_empresa:editar: la tabla queda de consulta.
  soloLectura?: boolean;
}

// Debajo de este umbral los días restantes se resaltan en ámbar.
const DIAS_RESALTADOS = 15;

function textoDias(dias: number): string {
  const unidad = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;
  if (dias > 0) return unidad(dias);
  if (dias === 0) return "Vence hoy";
  return `Vencido hace ${unidad(-dias)}`;
}

function claseDias(registro: RegistroRetencionEvaluado): string {
  if (registro.clasificacion === ClasificacionRetencion.VENCIDO) {
    return "text-red-600 dark:text-red-400";
  }
  if (registro.diasRestantes <= DIAS_RESALTADOS) return "text-amber-600 dark:text-amber-400";
  return "text-slate-700 dark:text-slate-300";
}

interface AccionFila {
  clave: string;
  label: string;
  icon: LucideIcon;
  habilitada: boolean;
  // Siempre presente: explica por qué está bloqueada o qué hace la acción.
  ayuda: string;
  onClick: () => void;
}

// Una fila puede ofrecer hasta dos acciones independientes (ver
// utils/retencion.ts): la de la política al vencer (no destructiva) y la
// baja lógica (intento de eliminación sobre una entidad crítica).
function accionesDeFila(
  registro: RegistroRetencionEvaluado,
  politica: PoliticaRetencion,
  onAplicarPolitica: (r: RegistroRetencionEvaluado) => void,
  onDarDeBaja: (r: RegistroRetencionEvaluado) => void,
): AccionFila[] {
  const acciones: AccionFila[] = [];

  if (registro.estado === EstadoRegistroRetencion.ACTIVO) {
    const resolucion = registro.accionPolitica;
    const accion =
      resolucion.tipo === "disponible" ? resolucion.accion : politica.accionAlVencer;
    acciones.push({
      clave: "politica",
      label: ACCION_VENCIMIENTO_META[accion].labelBoton,
      icon: accion === AccionVencimiento.REVISION_MANUAL ? ClipboardCheck : Archive,
      habilitada: resolucion.tipo === "disponible",
      ayuda: resolucion.tipo === "bloqueada" ? resolucion.motivo : resolucion.ayuda,
      onClick: () => onAplicarPolitica(registro),
    });
  }

  const eliminacion = registro.eliminacion;
  // "sin_accion" = ya dado de baja. "eliminacion_fisica" es inalcanzable hoy
  // (todas las entidades son críticas) y no hay endpoint para ofrecerla.
  if (eliminacion.tipo === "baja_logica" || eliminacion.tipo === "bloqueada") {
    acciones.push({
      clave: "baja",
      label: "Dar de baja (lógica)",
      icon: PowerOff,
      habilitada: eliminacion.tipo === "baja_logica",
      ayuda: eliminacion.tipo === "bloqueada" ? eliminacion.motivo : eliminacion.ayuda,
      onClick: () => onDarDeBaja(registro),
    });
  }

  return acciones;
}

function BotonAccion({ accion, isLoading }: { accion: AccionFila; isLoading: boolean }) {
  const tooltipId = useId();
  const Icono = accion.habilitada ? accion.icon : Lock;
  return (
    // El wrapper recibe foco cuando el botón está deshabilitado (un button
    // disabled no es focusable), así el motivo también llega por teclado.
    <span className="group relative inline-flex" tabIndex={accion.habilitada ? undefined : 0}>
      <button
        type="button"
        disabled={!accion.habilitada || isLoading}
        onClick={accion.onClick}
        aria-describedby={tooltipId}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed ${
          accion.habilitada
            ? accion.clave === "baja"
              ? "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
              : "border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-500/10"
            : "border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500"
        }`}
      >
        <Icono className="h-3.5 w-3.5" />
        {isLoading ? "Procesando..." : accion.label}
      </button>
      <span
        role="tooltip"
        id={tooltipId}
        className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 w-64 rounded-md bg-slate-900 px-3 py-2 text-xs font-normal leading-snug text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100 group-focus:opacity-100 dark:bg-slate-700"
      >
        {accion.ayuda}
      </span>
    </span>
  );
}

function fechaCreacionTexto(fechaCreacion: string): string {
  return parsearFechaLocal(fechaCreacion).toLocaleDateString("es-AR");
}

// HU-48 AC3/AC5/AC6: registros vencidos y próximos a vencer, ordenados por
// días restantes (el orden ya viene de useRetencion). Tabla desde xl; debajo
// pasa a cards para no generar scroll horizontal.
export function RegistrosProximosVencerTabla({
  registros,
  politica,
  procesandoClave,
  onAplicarPolitica,
  onDarDeBaja,
  soloLectura = false,
}: RegistrosProximosVencerTablaProps) {
  if (registros.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
        No hay registros que venzan en los próximos {politica.avisoAnticipado.diasAntes} días.
      </p>
    );
  }

  const filas = registros.map((registro) => ({
    registro,
    acciones: soloLectura
      ? []
      : accionesDeFila(registro, politica, onAplicarPolitica, onDarDeBaja),
    isLoading: procesandoClave === claveRegistro(registro),
  }));

  return (
    <>
      <div className="hidden rounded-xl border border-slate-200 bg-white xl:block dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-semibold">Entidad</th>
              <th className="px-4 py-3 font-semibold">Fecha de creación</th>
              <th className="px-4 py-3 font-semibold">Días restantes</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 text-right font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filas.map(({ registro, acciones, isLoading }) => (
              <tr key={claveRegistro(registro)}>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {ENTIDAD_RETENIBLE_META[registro.entidad].label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{registro.referencia}</p>
                </td>
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                  {fechaCreacionTexto(registro.fechaCreacion)}
                </td>
                <td className={`px-4 py-3 font-semibold ${claseDias(registro)}`}>
                  {textoDias(registro.diasRestantes)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={ESTADO_REGISTRO_META[registro.estado].badgeVariant}>
                    {ESTADO_REGISTRO_META[registro.estado].label}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    {acciones.length === 0 ? (
                      <span className="text-xs text-slate-400 dark:text-slate-500">Sin acciones</span>
                    ) : (
                      acciones.map((accion) => (
                        <BotonAccion key={accion.clave} accion={accion} isLoading={isLoading} />
                      ))
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="grid gap-3 md:grid-cols-2 xl:hidden">
        {filas.map(({ registro, acciones, isLoading }) => {
          const bloqueadas = acciones.filter((a) => !a.habilitada);
          return (
            <li
              key={claveRegistro(registro)}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {ENTIDAD_RETENIBLE_META[registro.entidad].label}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {registro.referencia}
                  </p>
                </div>
                <Badge variant={ESTADO_REGISTRO_META[registro.estado].badgeVariant}>
                  {ESTADO_REGISTRO_META[registro.estado].label}
                </Badge>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">Creado</dt>
                  <dd className="text-slate-700 dark:text-slate-300">
                    {fechaCreacionTexto(registro.fechaCreacion)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500 dark:text-slate-400">Días restantes</dt>
                  <dd className={`font-semibold ${claseDias(registro)}`}>
                    {textoDias(registro.diasRestantes)}
                  </dd>
                </div>
              </dl>
              {acciones.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {acciones.map((accion) => (
                    <BotonAccion key={accion.clave} accion={accion} isLoading={isLoading} />
                  ))}
                </div>
              )}
              {/* En touch no hay hover: el motivo del bloqueo va visible. Si
                  las dos acciones comparten motivo se muestra una vez. */}
              {[...new Set(bloqueadas.map((a) => a.ayuda))].map((motivo) => (
                <p key={motivo} className="flex gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                  {motivo}
                </p>
              ))}
            </li>
          );
        })}
      </ul>
    </>
  );
}
