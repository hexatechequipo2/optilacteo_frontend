// D-07: las pantallas de HU-77 (ConsultaLotesPage, LoteConsultaDetallePage)
// y HU-78 (DestinoSugeridoPage) usan datos mock, sin conexión al backend.
// Mientras sea así muestran AvisoDatosIlustrativos arriba del contenido.
//
// TODO(backend): cuando estén conectadas, poner este flag en false (o
// borrarlo junto con las líneas que lo usan en esas tres páginas).
export const LOTES_DATOS_ILUSTRATIVOS = true;
