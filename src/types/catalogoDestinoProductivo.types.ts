// HU-34 (Sprint 4, mock visual): el backend solo expone GET
// /destinos-productivos (catálogo de lectura, HU-49) — no hay alta,
// edición ni baja todavía. Esta capa local combina ese catálogo real con
// altas/ediciones/bajas hechas acá, sin tocar el backend. Ver
// useCatalogoDestinosProductivos.ts.
export interface OverridesCatalogoDestinos {
  // Destinos creados localmente. Se les asigna un id negativo (los reales
  // del backend son siempre positivos) para no colisionar nunca.
  creados: { id: number; nombre: string }[];
  // Sobrescribe el nombre de un destino ya existente (real o creado acá),
  // indexado por su id.
  nombresEditados: Record<number, string>;
  // Ids (reales o creados acá) marcados como inactivos localmente.
  desactivados: number[];
}
