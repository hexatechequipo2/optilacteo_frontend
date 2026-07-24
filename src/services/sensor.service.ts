import axios from "axios";
import api from "./api";
import type {
  CreateSensorDto,
  Sensor,
  SensorFilterQuery,
  SensorLoteHistorial,
  UpdateSensorDto,
} from "../types/sensor.types";

// El backend valida rango (min < max), unicidad de nombre por empresa y
// existencia del sensor/lote directamente (400/404/409 con mensaje); no
// hace falta duplicar esas validaciones acá. La empresa se resuelve del
// JWT en el backend (CurrentEmpresa), no se manda desde el cliente.
export const sensorService = {
  getAll: async (filters: SensorFilterQuery = {}): Promise<Sensor[]> => {
    const { data } = await api.get<Sensor[]>("/sensores", { params: filters });
    return data;
  },

  create: async (dto: CreateSensorDto): Promise<Sensor> => {
    const { data } = await api.post<Sensor>("/sensores", dto);
    return data;
  },

  update: async (id: number, dto: UpdateSensorDto): Promise<Sensor> => {
    const { data } = await api.patch<Sensor>(`/sensores/${id}`, dto);
    return data;
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/sensores/${id}`);
  },

  // HU-33: historial de asociaciones a lote de un sensor (append-only).
  getHistorial: async (sensorId: number): Promise<SensorLoteHistorial[]> => {
    const { data } = await api.get<SensorLoteHistorial[]>(`/sensores/${sensorId}/historial`);
    return data;
  },

  // Asocia uno o más sensores a un lote. Dispara automáticamente en el
  // backend el registro de cambio de ubicación del lote si corresponde.
  asociarALote: async (loteId: number, sensorIds: number[]): Promise<Sensor[]> => {
    const { data } = await api.patch<Sensor[]>(`/sensores/lote/${loteId}/asociar`, { sensorIds });
    return data;
  },
};

export function extraerMensajeError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err) && err.response?.data?.message) {
    const { message } = err.response.data;
    return Array.isArray(message) ? message.join(" ") : message;
  }
  return fallback;
}
