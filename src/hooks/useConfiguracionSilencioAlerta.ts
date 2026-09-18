import { useCallback, useEffect, useState } from "react";
import { configuracionSilencioAlertaService } from "../services/notificacion.service";
import type {
  ConfiguracionSilencioAlerta,
  CreateConfiguracionSilencioAlertaDto,
  UpdateConfiguracionSilencioAlertaDto,
} from "../types/configuracionSilencioAlerta.types";

interface UseConfiguracionSilencioAlertaResult {
  horarios: ConfiguracionSilencioAlerta[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  crear: (dto: CreateConfiguracionSilencioAlertaDto) => Promise<ConfiguracionSilencioAlerta>;
  isCreating: boolean;
  editar: (
    id: number,
    dto: UpdateConfiguracionSilencioAlertaDto,
  ) => Promise<ConfiguracionSilencioAlerta>;
  isUpdating: boolean;
  eliminar: (id: number) => Promise<void>;
  // id del horario cuya baja está en vuelo, para deshabilitar solo el
  // ConfirmModal de esa fila (no toda la tabla) — mismo criterio que
  // cambiandoEstadoId en useTambos.ts.
  eliminandoId: number | null;
}

// HU-30: horarios de silencio de alertas informativas (turno nocturno, fin
// de semana, etc.), scoped a empresa vía JWT. CRUD completo contra el
// backend real (ver notificacion.service.ts) — igual que useTambosCatalogo,
// refetch completo de la lista tras cada mutación en vez de tocar el
// estado local a mano (el backend es la única fuente de orden/verdad).
// Ninguna mutación atrapa sus propios errores: los propaga tal cual para
// que cada UI (formulario de alta/edición, confirmación de borrado) los
// muestre en su propio lugar (mismo criterio que
// AlertaAnomaliaDetallePanel.tsx para sus confirmaciones).
export function useConfiguracionSilencioAlerta(): UseConfiguracionSilencioAlertaResult {
  const [horarios, setHorarios] = useState<ConfiguracionSilencioAlerta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  const fetchHorarios = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await configuracionSilencioAlertaService.getAll();
      setHorarios(result);
    } catch {
      setError("No se pudieron cargar los horarios de silencio.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHorarios();
  }, [fetchHorarios]);

  const crear = useCallback(
    async (dto: CreateConfiguracionSilencioAlertaDto) => {
      setIsCreating(true);
      try {
        const creado = await configuracionSilencioAlertaService.create(dto);
        await fetchHorarios();
        return creado;
      } finally {
        setIsCreating(false);
      }
    },
    [fetchHorarios],
  );

  const editar = useCallback(
    async (id: number, dto: UpdateConfiguracionSilencioAlertaDto) => {
      setIsUpdating(true);
      try {
        const actualizado = await configuracionSilencioAlertaService.update(id, dto);
        await fetchHorarios();
        return actualizado;
      } finally {
        setIsUpdating(false);
      }
    },
    [fetchHorarios],
  );

  const eliminar = useCallback(
    async (id: number) => {
      setEliminandoId(id);
      try {
        await configuracionSilencioAlertaService.remove(id);
        await fetchHorarios();
      } finally {
        setEliminandoId(null);
      }
    },
    [fetchHorarios],
  );

  return {
    horarios,
    isLoading,
    error,
    refetch: fetchHorarios,
    crear,
    isCreating,
    editar,
    isUpdating,
    eliminar,
    eliminandoId,
  };
}
