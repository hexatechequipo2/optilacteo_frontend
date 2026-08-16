// HU-36 Parte 1/2 (maquetado): "tambo de origen" todavía no existe en el
// backend (Lote/Proveedor no lo modelan). Se muestra un valor mock
// determinístico por lote para poder maquetar la columna en la tabla real
// de Lotes. Se reemplaza por el dato real cuando el backend lo incorpore
// (Parte 2/2: alta de proveedor + tambo obligatorios al registrar un lote).
const TAMBOS_MOCK: string[] = [
  "Tambo San Isidro",
  "Tambo La Esperanza",
  "Tambo Don Benito",
  "Tambo Los Álamos",
  "Tambo Santa Rosa",
];

export function getTamboMock(loteId: number): string {
  return TAMBOS_MOCK[loteId % TAMBOS_MOCK.length];
}
