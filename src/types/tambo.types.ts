// Espeja el módulo real de Tambo en optilacteo-backend (src/module/tambo:
// entities, DTOs y mapper) — HU-36, mergeado en develop.
export interface Tambo {
  id: number;
  nombre: string;
  ubicacion?: string | null;
  activo: boolean;
  empresaId: number;
  proveedorId: number;
  createdAt: string;
}

export interface CreateTamboDto {
  nombre: string;
  ubicacion?: string;
  proveedorId: number;
}

// PATCH /tambos/:id (UpdateTamboDto en el backend): a propósito no incluye
// proveedorId (no se puede reasignar un tambo ya creado, ver comentario en
// update-tambo.dto.ts) ni activo (tiene sus propios endpoints dedicados:
// PATCH /tambos/:id/activar y DELETE /tambos/:id para la baja lógica).
export interface UpdateTamboDto {
  nombre?: string;
  ubicacion?: string;
}
