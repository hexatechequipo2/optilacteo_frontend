import { useCallback, useEffect, useState } from "react";
import { loteService } from "../services/lote.service";
import type {
  CreateLoteDto,
  FinalizarLoteDto,
  Lote,
  LoteCreateResponse,
  UpdateLoteDto,
} from "../types/lote.types";

interface UseLotesResult {
  lotes: Lote[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createLote: (dto: CreateLoteDto) => Promise<LoteCreateResponse>;
  isCreating: boolean;
  updateLote: (id: number, dto: UpdateLoteDto) => Promise<Lote>;
  isUpdating: boolean;
  finalizarLote: (id: number, dto?: FinalizarLoteDto) => Promise<Lote>;
  finalizandoId: number | null;
}

export function useLotes(): UseLotesResult {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [finalizandoId, setFinalizandoId] = useState<number | null>(null);

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

  const finalizarLote = useCallback(async (id: number, dto?: FinalizarLoteDto) => {
    setFinalizandoId(id);
    try {
      const actualizado = await loteService.finalizar(id, dto);
      setLotes((prev) => prev.map((l) => (l.id === id ? actualizado : l)));
      return actualizado;
    } finally {
      setFinalizandoId(null);
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
    finalizarLote,
    finalizandoId,
  };
}
