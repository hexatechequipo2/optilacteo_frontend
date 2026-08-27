import { useCallback, useEffect, useState } from "react";
import { tamboService } from "../services/tambo.service";
import type { Tambo, CreateTamboDto, UpdateTamboDto } from "../types/tambo.types";

interface UseTambosPorProveedorResult {
  tambos: Tambo[];
  isLoading: boolean;
  error: string | null;
}

// Combo encadenado del form de alta de lote (HU-36): la lista de tambos
// depende del proveedor elegido (GET /tambos?proveedorId=xxx). Sin proveedor
// seleccionado no hay nada que pedirle al backend.
export function useTambosPorProveedor(proveedorId: number | null): UseTambosPorProveedorResult {
  const [tambos, setTambos] = useState<Tambo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTambos = useCallback(async () => {
    if (proveedorId == null) {
      setTambos([]);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await tamboService.getByProveedor(proveedorId);
      setTambos(result);
    } catch {
      setError("No se pudieron cargar los tambos de este proveedor.");
      setTambos([]);
    } finally {
      setIsLoading(false);
    }
  }, [proveedorId]);

  useEffect(() => {
    fetchTambos();
  }, [fetchTambos]);

  return { tambos, isLoading, error };
}

interface UseTambosCatalogoResult {
  tambos: Tambo[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createTambo: (dto: CreateTamboDto) => Promise<Tambo>;
  isCreating: boolean;
  updateTambo: (id: number, dto: UpdateTamboDto) => Promise<Tambo>;
  isUpdating: boolean;
  activarTambo: (id: number) => Promise<Tambo>;
  darDeBajaTambo: (id: number) => Promise<Tambo>;
  // id del tambo cuyo activar/dar de baja está en vuelo, para deshabilitar
  // solo el botón de esa fila (no toda la tabla) mientras se resuelve.
  cambiandoEstadoId: number | null;
}

// Catálogo completo de Tambos (pantalla TambosPage.tsx): a diferencia de
// useTambosPorProveedor, acá no depende de un proveedor elegido — trae todo
// el universo de la empresa (GET /tambos sin query) y expone las acciones de
// alta/edición/baja/reactivación.
export function useTambosCatalogo(): UseTambosCatalogoResult {
  const [tambos, setTambos] = useState<Tambo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState<number | null>(null);

  const fetchTambos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await tamboService.getAll();
      setTambos(result);
    } catch {
      setError("No se pudieron cargar los tambos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTambos();
  }, [fetchTambos]);

  // Refetch completo en vez de actualizar el estado local a mano: el
  // backend ordena por nombre (findAllByEmpresa), mismo criterio que
  // useProveedores.createProveedor/updateProveedor.
  const createTambo = useCallback(
    async (dto: CreateTamboDto) => {
      setIsCreating(true);
      try {
        const nuevo = await tamboService.create(dto);
        await fetchTambos();
        return nuevo;
      } finally {
        setIsCreating(false);
      }
    },
    [fetchTambos],
  );

  const updateTambo = useCallback(
    async (id: number, dto: UpdateTamboDto) => {
      setIsUpdating(true);
      try {
        const actualizado = await tamboService.update(id, dto);
        await fetchTambos();
        return actualizado;
      } finally {
        setIsUpdating(false);
      }
    },
    [fetchTambos],
  );

  const activarTambo = useCallback(
    async (id: number) => {
      setCambiandoEstadoId(id);
      try {
        const actualizado = await tamboService.activar(id);
        await fetchTambos();
        return actualizado;
      } finally {
        setCambiandoEstadoId(null);
      }
    },
    [fetchTambos],
  );

  const darDeBajaTambo = useCallback(
    async (id: number) => {
      setCambiandoEstadoId(id);
      try {
        const actualizado = await tamboService.darDeBaja(id);
        await fetchTambos();
        return actualizado;
      } finally {
        setCambiandoEstadoId(null);
      }
    },
    [fetchTambos],
  );

  return {
    tambos,
    isLoading,
    error,
    refetch: fetchTambos,
    createTambo,
    isCreating,
    updateTambo,
    isUpdating,
    activarTambo,
    darDeBajaTambo,
    cambiandoEstadoId,
  };
}
