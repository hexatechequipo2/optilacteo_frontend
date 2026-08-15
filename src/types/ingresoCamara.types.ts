// HU-67 (Maquetado): registro de ingreso a cámara de producto terminado.
// Todavía sin backend — mock data en constants/ingresoCamaraMock.ts.
export interface IngresoCamara {
  id: string;
  sku: string;
  cantidad: number;
  unidad: string;
  loteOrigen: string;
  fecha: string;
}
