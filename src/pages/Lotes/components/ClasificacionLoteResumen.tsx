import { Badge } from "../../../components/ui/Badge";
import { ClasificacionLoteBadge } from "../../../components/ClasificacionLoteBadge";
import {
  PARAMETROS_META,
  type ParametroVisible,
} from "../../Configuracion/constants/parametrosCalidad";
import type { Lote, NivelMotivoClasificacion } from "../../../types/lote.types";

// HU-76: resultado de la clasificación automática (Apto / No Apto /
// Pendiente), marca de aprobación manual (HU-22) y los parámetros que la
// explican, tal como los manda el backend en clasificacionMotivos.

const NIVEL_LABEL: Record<NivelMotivoClasificacion, string> = {
  critico: "Crítico",
  alerta: "Alerta",
};

const NIVEL_CLASS: Record<NivelMotivoClasificacion, string> = {
  critico: "text-red-700 dark:text-red-400",
  alerta: "text-amber-700 dark:text-amber-400",
};

// Sin ceros de más: 3.2 en vez de 3.20 (el decimal de la DB puede llegar así).
const formatearNumero = (valor: number | string) => String(Number(valor));

interface ClasificacionLoteResumenProps {
  lote: Pick<Lote, "clasificacion" | "clasificacionMotivos" | "clasificacionManual">;
  // Tabla/tarjeta: sin el rango normal y con texto más chico.
  compacto?: boolean;
}

export function ClasificacionLoteResumen({
  lote,
  compacto = false,
}: ClasificacionLoteResumenProps) {
  const motivos = lote.clasificacionMotivos;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <ClasificacionLoteBadge resultado={lote.clasificacion} />
        {lote.clasificacionManual && <Badge variant="info">Aprobado manualmente</Badge>}
      </div>
      {motivos.length > 0 && (
        <ul
          aria-label={
            lote.clasificacionManual ? "Motivos revisados" : "Motivos de la clasificación"
          }
          className={`flex flex-col gap-0.5 ${compacto ? "text-xs" : "text-sm"} text-slate-600 dark:text-slate-400`}
        >
          {motivos.map((m) => {
            const meta = PARAMETROS_META[m.parametro as ParametroVisible];
            return (
              <li key={m.parametro}>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {meta?.label ?? m.parametro}
                </span>{" "}
                {/* Valor y unidad juntos: no se separan en el salto de línea. */}
                <span className="whitespace-nowrap">
                  {formatearNumero(m.valor)}
                  {meta && meta.unidad !== "sin unidad" ? ` ${meta.unidad}` : ""}
                </span>{" "}
                ·{" "}
                <span className={`font-medium ${NIVEL_CLASS[m.nivel]}`}>
                  {NIVEL_LABEL[m.nivel]}
                </span>
                {!compacto &&
                  ` (rango normal ${formatearNumero(m.umbralMin)} – ${formatearNumero(m.umbralMax)})`}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
