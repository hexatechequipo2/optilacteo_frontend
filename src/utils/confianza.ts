export type NivelConfianza = "alta" | "media" | "baja";

// HU-50: cortes de confianza del modelo ML de anomalías (0-100), definidos
// para esta HU porque no existía ninguna escala reusable — RecomendacionDestinoCard.tsx
// (HU-49) solo recibe `nivelConfianza` ya resuelto por prop, nunca calculó un
// nivel a partir de un porcentaje. Único punto de verdad para esta
// conversión: cuando se resuelva el hardcodeo de `recomendacionDestino` en
// null (LoteFormModal.tsx), esta misma función debería reusarse ahí en vez
// de duplicar la escala.
export function getNivelConfianza(valor: number): NivelConfianza {
  if (valor >= 80) return "alta";
  if (valor >= 50) return "media";
  return "baja";
}
