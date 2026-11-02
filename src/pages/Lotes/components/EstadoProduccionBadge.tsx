import { Badge } from "../../../components/ui/Badge";
import type { LoteProduccionResumen } from "../../../types/consultaLotesProduccion.types";
import { ESTADO_PRODUCCION_LABEL, ESTADO_PRODUCCION_VARIANT } from "../constants/estadoProduccion";

// Estado derivado del lote de producción; la explicación del back va en el title.
export function EstadoProduccionBadge({
  lote,
}: {
  lote: Pick<LoteProduccionResumen, "estado" | "estadoDescripcion">;
}) {
  return (
    <span title={lote.estadoDescripcion}>
      <Badge variant={ESTADO_PRODUCCION_VARIANT[lote.estado]}>{ESTADO_PRODUCCION_LABEL[lote.estado]}</Badge>
    </span>
  );
}
