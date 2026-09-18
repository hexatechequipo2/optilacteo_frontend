// HU-69: la migración AddNumeroRemitoToLote (optilacteo-backend) agregó la
// columna numeroRemito como NOT NULL y backfilleó 'S/D' en los lotes que ya
// existían en la base al momento de aplicarla — en optilacteo_dev son ~88
// lotes, la mayoría de los que hay hoy. Ese valor no es un remito real: hay
// que tratarlo como ausencia de dato en toda la UI (modal de trazabilidad,
// listado de lotes, CSV exportado), nunca mostrarlo como si fuera un número
// válido. Constante única acá para no repetir el string mágico por
// componente.
export const REMITO_BACKFILL_SIN_DATO = "S/D";

export const REMITO_SIN_DATO_LABEL = "Sin remito registrado";

// `valor` viene tipado string | null | undefined según el origen: el campo
// siempre está presente y no es null en el objeto Lote (columna NOT NULL en
// el backend), pero puede llegar undefined mientras el dato todavía no
// cargó (ej. eventos de trazabilidad antes de resolver el fetch).
export function tieneNumeroRemito(
  valor: string | null | undefined,
): valor is string {
  return !!valor && valor !== REMITO_BACKFILL_SIN_DATO;
}

export function formatearNumeroRemito(
  valor: string | null | undefined,
): string {
  return tieneNumeroRemito(valor) ? valor : REMITO_SIN_DATO_LABEL;
}
