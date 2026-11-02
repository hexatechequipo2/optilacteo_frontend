import { Navigate } from "react-router-dom";
import { LOTES_DESTINO_SUGERIDO_MOCK } from "./constants/destinoSugerido";

// HU-78: entrada desde el ítem del Sidebar. DestinoSugeridoPage necesita un
// código en la URL y ya trae su propio selector, así que se abre con el
// primer lote apto del mock (D-08: los No Apto no tienen sugerencia).
// TODO(HU-78): cuando se conecte al back (GET /recomendaciones/lote/:loteId),
// esta ruta tiene que mostrar un selector de lotes reales en lugar de
// redirigir a un código mock.
const PRIMER_APTO = LOTES_DESTINO_SUGERIDO_MOCK.find((l) => l.estadoInicial !== "no_aplica");

export default function DestinoSugeridoInicio() {
  return PRIMER_APTO ? (
    <Navigate to={`/lotes/${PRIMER_APTO.codigo}/destino-sugerido`} replace />
  ) : (
    <Navigate to="/lotes/consulta" replace />
  );
}
