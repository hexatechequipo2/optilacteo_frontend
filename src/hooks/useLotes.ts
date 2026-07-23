import { useCallback, useEffect, useState } from "react";
import { loteService } from "../services/lote.service";
import type { CreateLoteDto, Lote } from "../types/lote.types";

interface UseLotesResult {
  lotes: Lote[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createLote: (dto: CreateLoteDto) => Promise<Lote>;
  isCreating: boolean;
}

export function useLotes(): UseLotesResult {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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
  // igual que useConfigParametros con saveConfig.
  const createLote = useCallback(async (dto: CreateLoteDto) => {
    setIsCreating(true);
    try {
      const nuevo = await loteService.create(dto);
      setLotes((prev) => [...prev, nuevo]);
      return nuevo;
    } finally {
      setIsCreating(false);
    }
  }, []);

  return { lotes, isLoading, error, refetch: fetchLotes, createLote, isCreating };
}
