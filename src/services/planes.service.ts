import api from "./api";
import type { Plan, CreatePlanDto } from "../types/plan.types";

export const planesService = {
  getAll: async (): Promise<Plan[]> => {
    const { data } = await api.get<Plan[]>("/planes");
    return data;
  },

  getById: async (id: number): Promise<Plan> => {
    const { data } = await api.get<Plan>(`/planes/${id}`);
    return data;
  },

  create: async (dto: CreatePlanDto): Promise<Plan> => {
    const { data } = await api.post<Plan>("/planes", dto);
    return data;
  },

  update: async (id: number, dto: Partial<CreatePlanDto>): Promise<Plan> => {
    const { data } = await api.patch<Plan>(`/planes/${id}`, dto);
    return data;
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/planes/${id}`);
  },
};
