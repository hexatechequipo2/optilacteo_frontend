import { useCallback, useEffect, useState } from "react";
import { loteService } from "../services/lote.service";
import type { CreateLoteDto, Lote, LoteCreateResponse, UpdateLoteDto } from "../types/lote.types";

interface UseLotesResult {
  lotes: Lote[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createLote: (dto: CreateLoteDto) => Promise<LoteCreateResponse>;
  isCreating: boolean;
  updateLote: (id: number, dto: UpdateLoteDto) => Promise<Lote>;
  isUpdating: boolean;
}

export function useLotes(): UseLotesResult {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchLotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await loteService.getAll();
      setLotes(result);
    } catch {
      setError("No se pudieron cargar los lotes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLotes();
  }, [fetchLotes]);

  // No hace refetch completo: agrega el lote recién creado al estado local,
  // igual que useConfigParametros con saveConfig. Devuelve la respuesta
  // completa (incluye sensoresDisponibles) para que el formulario pueda
  // ofrecer la asociación en el mismo paso.
  const createLote = useCallback(async (dto: CreateLoteDto) => {
    setIsCreating(true);
    try {
      const respuesta = await loteService.create(dto);
      setLotes((prev) => [...prev, respuesta.lote]);
      return respuesta;
    } finally {
      setIsCreating(false);
    }
  }, []);

  const updateLote = useCallback(async (id: number, dto: UpdateLoteDto) => {
    setIsUpdating(true);
    try {
      const actualizado = await loteService.update(id, dto);
      setLotes((prev) => prev.map((l) => (l.id === id ? actualizado : l)));
      return actualizado;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return {
    lotes,
    isLoading,
    error,
    refetch: fetchLotes,
    createLote,
    isCreating,
    updateLote,
    isUpdating,
  };
}
