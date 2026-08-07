import { UnidadRendimiento } from "../../../types/lote.types";

// HU-62 (extensión): compartido entre FinalizarLoteModal (selector al
// cargar) y LotesPage (columna + filtro de categoría). Un solo lugar para
// no repetir las 3 opciones ni desalinear etiquetas.
export const UNIDAD_RENDIMIENTO_LABEL: Record<UnidadRendimiento, string> = {
  [UnidadRendimiento.LITROS]: "Litros",
  [UnidadRendimiento.KILOGRAMOS]: "Kilogramos",
  [UnidadRendimiento.PORCENTAJE]: "Porcentaje",
};

// Símbolo corto para mostrar junto al valor numérico en la tabla (ej: "92.5 %").
export const UNIDAD_RENDIMIENTO_SIMBOLO: Record<UnidadRendimiento, string> = {
  [UnidadRendimiento.LITROS]: "L",
  [UnidadRendimiento.KILOGRAMOS]: "kg",
  [UnidadRendimiento.PORCENTAJE]: "%",
};

export const UNIDAD_RENDIMIENTO_SELECT_OPTIONS = [
  { value: "", label: "Seleccioná una unidad" },
  ...Object.values(UnidadRendimiento).map((unidad) => ({
    value: unidad,
    label: UNIDAD_RENDIMIENTO_LABEL[unidad],
  })),
];
