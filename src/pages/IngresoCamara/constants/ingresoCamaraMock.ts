import type { IngresoCamara } from "../../../types/ingresoCamara.types";

// Mock temporal para el maquetado de HU-67. Se reemplaza por datos reales
// del backend cuando se conecte al módulo de producto terminado.
export const INGRESOS_CAMARA_MOCK: IngresoCamara[] = [
  {
    id: "1",
    sku: "Manteca x 200g",
    cantidad: 10,
    unidad: "unidades",
    loteOrigen: "L-2026-2210",
    fecha: "09/08/2026",
  },
  {
    id: "2",
    sku: "Leche entera x 1L",
    cantidad: 240,
    unidad: "unidades",
    loteOrigen: "L-2026-2198",
    fecha: "08/08/2026",
  },
  {
    id: "3",
    sku: "Yogur bebible x 900ml",
    cantidad: 60,
    unidad: "unidades",
    loteOrigen: "L-2026-2205",
    fecha: "07/08/2026",
  },
  {
    id: "4",
    sku: "Queso cremoso x 500g",
    cantidad: 35,
    unidad: "unidades",
    loteOrigen: "L-2026-2190",
    fecha: "05/08/2026",
  },
];
