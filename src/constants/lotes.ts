// D-07: las pantallas que todavía usan datos mock muestran
// AvisoDatosIlustrativos arriba del contenido mientras este flag sea true.
// Hoy: LoteConsultaDetallePage (HU-77, se conecta en el paso 3) y
// DestinoSugeridoPage (HU-78). ConsultaLotesPage ya está conectada.
//
// TODO(backend): cuando estén conectadas, poner este flag en false (o
// borrarlo junto con las líneas que lo usan en esas páginas).
export const LOTES_DATOS_ILUSTRATIVOS = true;
