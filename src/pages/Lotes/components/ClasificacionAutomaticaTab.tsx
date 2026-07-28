import { AlertTriangle } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { ClasificacionLoteBadge } from "../../../components/ClasificacionLoteBadge";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import { useClasificacionLote } from "../../../hooks/useClasificacionLote";
import { EstadoLectura } from "../../../types/historialMediciones.types";
import { ResultadoClasificacion } from "../../../types/clasificacionLote.types";
import type { Lote } from "../../../types/lote.types";
import { PARAMETRO_LABEL, UNIDAD_POR_PARAMETRO } from "../../Sensores/constants/parametroSensor";

const ESTADO_LABEL: Record<EstadoLectura, string> = {
  [EstadoLectura.NORMAL]: "Dentro de umbral",
  [EstadoLectura.FUERA_DE_RANGO]: "Fuera de umbral",
  [EstadoLectura.SIN_UMBRAL_CONFIGURADO]: "Sin umbral configurado",
};

const ESTADO_VARIANT: Record<EstadoLectura, "success" | "danger" | "warning"> = {
  [EstadoLectura.NORMAL]: "success",
  [EstadoLectura.FUERA_DE_RANGO]: "danger",
  [EstadoLectura.SIN_UMBRAL_CONFIGURADO]: "warning",
};

// Texto de la alerta que hoy es solo visual: la notificación real a
// Responsable de Calidad la va a disparar el backend (ver TODO en
// useClasificacionLote.ts). Se muestra igual para dejar validado el
// criterio de aceptación desde la pantalla.
const ALERTA_LABEL: Partial<Record<ResultadoClasificacion, string>> = {
  [ResultadoClasificacion.NO_APTO]: "Este lote fue clasificado como No Apto.",
  [ResultadoClasificacion.EN_REVISION]: "Este lote quedó En Revisión.",
};

interface ClasificacionAutomaticaTabProps {
  lote: Lote;
}

export function ClasificacionAutomaticaTab({ lote }: ClasificacionAutomaticaTabProps) {
  const { clasificacion, isLoading, umbralesNoDisponibles } = useClasificacionLote(lote);
  const alerta = ALERTA_LABEL[clasificacion.resultado];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-1">
          <SectionHeader>CLASIFICACIÓN AUTOMÁTICA</SectionHeader>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Calculada a partir de los parámetros registrados y los umbrales configurados.
          </p>
        </div>
        <ClasificacionLoteBadge resultado={clasificacion.resultado} />
      </div>

      {alerta && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{alerta} El Responsable de Calidad debería recibir una notificación.</span>
        </div>
      )}

      {umbralesNoDisponibles && (
        <p className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          No se pudieron cargar los umbrales configurados: el resultado puede no ser definitivo.
        </p>
      )}

      <div className="flex flex-col gap-3">
        <SectionHeader>PARÁMETROS UTILIZADOS</SectionHeader>
        {isLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Calculando clasificación...</p>
        ) : clasificacion.parametrosUtilizados.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Este lote todavía no tiene parámetros registrados.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {clasificacion.parametrosUtilizados.map((p) => (
              <li
                key={p.parametro}
                className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-2 text-sm dark:border-slate-800"
              >
                <span className="text-slate-700 dark:text-slate-300">
                  {PARAMETRO_LABEL[p.parametro] ?? p.parametro}: {p.valor}
                  {UNIDAD_POR_PARAMETRO[p.parametro] ? ` ${UNIDAD_POR_PARAMETRO[p.parametro]}` : ""}
                  {p.umbralMin !== null && p.umbralMax !== null && (
                    <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                      (umbral: {p.umbralMin} – {p.umbralMax})
                    </span>
                  )}
                </span>
                <Badge variant={ESTADO_VARIANT[p.estado]}>{ESTADO_LABEL[p.estado]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Última actualización: {new Date(clasificacion.fecha).toLocaleString("es-AR")}
      </p>
    </div>
  );
}
