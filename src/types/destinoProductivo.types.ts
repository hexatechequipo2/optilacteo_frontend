// HU-49/HU-34: catálogo de destinos productivos configurable por empresa
// (tabla destinos_productivos en el backend, GET /destinos-productivos).
// No confundir con DestinoLote (lote.types.ts): ese es el enum fijo de
// destinoInicial (producción/almacenamiento/tratamiento/descarte); este es
// el destino productivo real/final del lote, y ambos conceptos conviven
// (ver el comentario en destino-productivo.entity.ts del backend).
export interface DestinoProductivo {
  id: number;
  nombre: string;
}
