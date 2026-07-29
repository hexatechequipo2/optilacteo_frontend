import { Badge } from "../../../components/ui/Badge";
import { ClasificacionLoteBadge } from "../../../components/ClasificacionLoteBadge";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import { useClasificacionLote } from "../../../hooks/useClasificacionLote";
import { EstadoLectura } from "../../../types/historialMediciones.types";
import { ClasificacionLote } from "../../../types/lote.types";
import type { Lote } from "../../../types/lote.types";
import { PARAMETRO_LABEL, UNIDAD_POR_PARAMETRO } from "../../Sensores/constants/parametroSensor";

const ESTADO_LABEL: Partial<Record<EstadoLectura, string>> = {
  [EstadoLectura.NORMAL]: "Dentro de umbral",
  [EstadoLectura.FUERA_DE_RANGO]: "Fuera de umbral",
};

const ESTADO_VARIANT: Partial<Record<EstadoLectura, "success" | "danger">> = {
  [EstadoLectura.NORMAL]: "success",
  [EstadoLectura.FUERA_DE_RANGO]: "danger",
};

interface ClasificacionAutomaticaTabProps {
  lote: Lote;
}

export function ClasificacionAutomaticaTab({ lote }: ClasificacionAutomaticaTabProps) {
  const { clasificacion, isLoading } = useClasificacionLote(lote);

  // El parámetro que efectivamente determinó el No Apto (no el primero de la
  // lista al azar: puede haber varios registrados y solo uno fuera de rango).
  const parametroFueraDeRango = clasificacion?.parametrosUtilizados?.find(
    (p) => p.estado === EstadoLectura.FUERA_DE_RANGO,
  );

  let textoSubtitulo = "Calculada por el sistema a partir de los parámetros registrados.";

  if (clasificacion?.resultado === ClasificacionLote.NO_APTO && parametroFueraDeRango) {
    const { parametro, valor, umbralMin, umbralMax } = parametroFueraDeRango;
    const nombre = PARAMETRO_LABEL[parametro] ?? parametro;
    // Si no hay umbral configurado para este parámetro no inventamos un
    // rango: el valor "1.00 - 2.00" hardcodeado que había acá antes se veía
    // como si fuera el umbral real configurado y no lo era.
    const rango =
      umbralMin !== null && umbralMax !== null
        ? ` (rango permitido: ${umbralMin} – ${umbralMax})`
        : "";
    textoSubtitulo = `El valor de "${nombre}" (${valor}) está fuera del umbral configurado${rango}.`;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Tarjeta de Clasificación */}
      <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <SectionHeader>CLASIFICACIÓN AUTOMÁTICA</SectionHeader>
          {/* Subtítulo integrado con tamaño superior y el color Slate habitual */}
          <p className="text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
            {textoSubtitulo}
          </p>
        </div>
        <div className="shrink-0 pt-0.5">
          {clasificacion ? (
            <ClasificacionLoteBadge resultado={clasificacion.resultado} />
          ) : (
            <span className="text-sm text-slate-400 dark:text-slate-500">Sin clasificar</span>
          )}
        </div>
      </div>

      {/* Lista de Parámetros Utilizados */}
      <div className="flex flex-col gap-3">
        <SectionHeader>PARÁMETROS UTILIZADOS</SectionHeader>
        {isLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando parámetros...</p>
        ) : !clasificacion || clasificacion.parametrosUtilizados.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Este lote todavía no tiene parámetros registrados.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {clasificacion.parametrosUtilizados.map((p) => {
              const tieneEstadoDefinido =
                p.estado === EstadoLectura.NORMAL || p.estado === EstadoLectura.FUERA_DE_RANGO;

              return (
                <li
                  key={p.parametro}
                  className="flex items-center justify-between gap-2 rounded-md border border-slate-200 px-4 py-2 text-sm dark:border-slate-800"
                >
                  <span className="text-slate-700 dark:text-slate-300">
                    {PARAMETRO_LABEL[p.parametro] ?? p.parametro}: {p.valor}
                    {UNIDAD_POR_PARAMETRO[p.parametro]
                      ? ` ${UNIDAD_POR_PARAMETRO[p.parametro]}`
                      : ""}
                  </span>

                  {/* Solo renderiza el Badge si está dentro o fuera de rango */}
                  {tieneEstadoDefinido && ESTADO_LABEL[p.estado] && ESTADO_VARIANT[p.estado] && (
                    <Badge variant={ESTADO_VARIANT[p.estado]!}>
                      {ESTADO_LABEL[p.estado]}
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}