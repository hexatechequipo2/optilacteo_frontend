import { useCallback, useEffect, useState } from "react";
import { planesService } from "../services/planes.service";
import type { Plan, CreatePlanDto } from "../types/plan.types";

interface UsePlanesResult {
  planes: Plan[];
  isLoading: boolean;
  error: string | null;
  fetchPlanes: () => Promise<void>;
  createPlan: (dto: CreatePlanDto) => Promise<void>;
  isCreating: boolean;
  updatePlan: (id: number, dto: Partial<CreatePlanDto>) => Promise<void>;
  isUpdating: boolean;
  deletePlan: (id: number) => Promise<void>;
}

export function usePlanes(): UsePlanesResult {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlanes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await planesService.getAll();
      setPlanes(data);
    } catch {
      setError("No se pudieron cargar los planes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlanes();
  }, [fetchPlanes]);

  const createPlan = useCallback(
    async (dto: CreatePlanDto) => {
      setIsCreating(true);
      try {
        await planesService.create(dto);
        await fetchPlanes();
      } finally {
        setIsCreating(false);
      }
    },
    [fetchPlanes],
  );

  const updatePlan = useCallback(
    async (id: number, dto: Partial<CreatePlanDto>) => {
      setIsUpdating(true);
      try {
        await planesService.update(id, dto);
        await fetchPlanes();
      } finally {
        setIsUpdating(false);
      }
    },
    [fetchPlanes],
  );

  const deletePlan = useCallback(
    async (id: number) => {
      await planesService.remove(id);
      await fetchPlanes();
    },
    [fetchPlanes],
  );

  return {
    planes,
    isLoading,
    error,
    fetchPlanes,
    createPlan,
    isCreating,
    updatePlan,
    isUpdating,
    deletePlan,
  };
}
