import { useCallback, useEffect, useState } from "react";
import { sensorService } from "../services/sensor.service";
import type { CreateSensorDto, Sensor, SensorFilterQuery, UpdateSensorDto } from "../types/sensor.types";

interface UseSensoresResult {
  sensores: Sensor[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createSensor: (dto: CreateSensorDto) => Promise<Sensor>;
  isCreating: boolean;
  updateSensor: (id: number, dto: UpdateSensorDto) => Promise<Sensor>;
  isUpdating: boolean;
}

// La empresa se resuelve en el backend a partir del JWT (CurrentEmpresa),
// no hace falta resolverla ni pasarla desde acá.
export function useSensores(filters: SensorFilterQuery = {}): UseSensoresResult {
  const { nombre, tipo, parametro, estado, ubicacion } = filters;

  const [sensores, setSensores] = useState<Sensor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchSensores = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await sensorService.getAll({ nombre, tipo, parametro, estado, ubicacion });
      setSensores(result);
    } catch {
      setError("No se pudieron cargar los sensores.");
    } finally {
      setIsLoading(false);
    }
  }, [nombre, tipo, parametro, estado, ubicacion]);

  useEffect(() => {
    fetchSensores();
  }, [fetchSensores]);

  // No hace refetch completo: agrega el sensor recién creado al estado
  // local, mismo patrón que createLote en useLotes.ts.
  const createSensor = useCallback(async (dto: CreateSensorDto) => {
    setIsCreating(true);
    try {
      const nuevo = await sensorService.create(dto);
      setSensores((prev) => [...prev, nuevo]);
      return nuevo;
    } finally {
      setIsCreating(false);
    }
  }, []);

  const updateSensor = useCallback(async (id: number, dto: UpdateSensorDto) => {
    setIsUpdating(true);
    try {
      const actualizado = await sensorService.update(id, dto);
      setSensores((prev) => prev.map((s) => (s.id === id ? actualizado : s)));
      return actualizado;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return {
    sensores,
    isLoading,
    error,
    refetch: fetchSensores,
    createSensor,
    isCreating,
    updateSensor,
    isUpdating,
  };
}
