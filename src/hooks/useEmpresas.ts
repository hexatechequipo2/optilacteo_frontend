import { useCallback, useEffect, useState } from "react";
import { empresasService, type CreateEmpresaDto } from "../services/empresa.service";
import type { EmpresaType, UpdateEmpresaDto } from "../types/empresa.types";

interface UseEmpresasResult {
  empresas: EmpresaType[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createEmpresa: (dto: CreateEmpresaDto) => Promise<void>;
  isCreating: boolean;
  /**
   * Actualiza datos de la empresa y, si el estado activo/inactivo cambió,
   * dispara el endpoint dedicado correspondiente.
   */
  updateEmpresa: (
    id: number,
    dto: UpdateEmpresaDto,
    nuevoEstado: boolean,
  ) => Promise<void>;
  isUpdating: boolean;
}

export function useEmpresas(): UseEmpresasResult {
  const [empresas, setEmpresas] = useState<EmpresaType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmpresas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await empresasService.getAll();
      setEmpresas(data);
    } catch {
      setError("No se pudieron cargar las empresas.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmpresas();
  }, [fetchEmpresas]);

  const createEmpresa = useCallback(
    async (dto: CreateEmpresaDto) => {
      setIsCreating(true);
      try {
        await empresasService.create(dto);
        await fetchEmpresas();
      } finally {
        setIsCreating(false);
      }
    },
    [fetchEmpresas],
  );

  const updateEmpresa = useCallback(
    async (id: number, dto: UpdateEmpresaDto, nuevoEstado: boolean) => {
      setIsUpdating(true);
      try {
        const empresaActual = empresas.find((e) => e.id === id);
        await empresasService.update(id, dto);

        if (empresaActual && empresaActual.isActive !== nuevoEstado) {
          if (nuevoEstado) {
            await empresasService.activate(id);
          } else {
            await empresasService.deactivate(id);
          }
        }

        await fetchEmpresas();
      } finally {
        setIsUpdating(false);
      }
    },
    [empresas, fetchEmpresas],
  );

  return {
    empresas,
    isLoading,
    error,
    refetch: fetchEmpresas,
    createEmpresa,
    isCreating,
    updateEmpresa,
    isUpdating,
  };
}
