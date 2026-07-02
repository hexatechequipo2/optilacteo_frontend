import { useMemo } from "react";
import { useEmpresas } from "./useEmpresas";
import { useUsuarios } from "./useUsuarios";
import { usePlanes } from "./usePlanes";
import type { EmpresaType, ModuloEnum } from "../types/empresa.types";
import type { Plan } from "../types/plan.types";

const TODOS_LOS_MODULOS: ModuloEnum[] = [
  "dashboard",
  "recepcion",
  "destino_productivo_ia",
  "monitoreo_alertas",
  "sensores_iot",
  "trazabilidad",
  "reportes_forecast",
  "asistente_voz",
];

export interface ModuloUsage {
  modulo: ModuloEnum;
  empresasConModulo: number;
}

export interface PlanDistribucion {
  id: number;
  nombre: string;
  precio: number;
  empresasAsignadas: number;
  porcentaje: number;
}

interface UseDashboardResult {
  isLoading: boolean;
  error: string | null;
  empresas: EmpresaType[];
  planes: Plan[];
  totalEmpresas: number;
  empresasActivas: number;
  empresasEnTrial: number;
  totalUsuarios: number;
  usuariosActivos: number;
  promedioModulosPorEmpresa: number;
  totalModulosDisponibles: number;
  distribucionPorPlan: PlanDistribucion[];
  modulosMasHabilitados: ModuloUsage[];
  refetch: () => Promise<void>;
}

export function useDashboard(): UseDashboardResult {
  const {
    empresas,
    isLoading: isLoadingEmpresas,
    error: errorEmpresas,
    refetch: refetchEmpresas,
  } = useEmpresas();

  const {
    usuarios,
    isLoading: isLoadingUsuarios,
    error: errorUsuarios,
    refetch: refetchUsuarios,
  } = useUsuarios();

  const {
    planes,
    isLoading: isLoadingPlanes,
    error: errorPlanes,
    fetchPlanes,
  } = usePlanes();

  const totalEmpresas = empresas.length;

  const empresasActivas = useMemo(
    () => empresas.filter((empresa) => empresa.isActive).length,
    [empresas],
  );

  // TODO(HU-08): el backend no distingue el estado "trial" — EmpresaType.isActive
  // solo representa activo/suspendido (ver comentario análogo en EmpresasPage.tsx).
  // Necesitaríamos que GET /empresa devuelva un campo de estado, ej.
  // estado: 'trial' | 'activa' | 'suspendida', para reemplazar este mock.
  const empresasEnTrial = 0;

  const totalUsuarios = usuarios.length;

  const usuariosActivos = useMemo(
    () => usuarios.filter((usuario) => usuario.isActive).length,
    [usuarios],
  );

  const promedioModulosPorEmpresa = useMemo(() => {
    if (totalEmpresas === 0) return 0;
    const totalActivos = empresas.reduce(
      (sum, empresa) =>
        sum + (empresa.modulos?.filter((m) => m.isActive).length ?? 0),
      0,
    );
    return Math.round(totalActivos / totalEmpresas);
  }, [empresas, totalEmpresas]);

  const distribucionPorPlan = useMemo<PlanDistribucion[]>(() => {
    return planes.map((plan) => ({
      id: plan.id,
      nombre: plan.nombre,
      precio: plan.precio,
      empresasAsignadas: plan.empresasAsignadas,
      porcentaje:
        totalEmpresas === 0
          ? 0
          : (plan.empresasAsignadas / totalEmpresas) * 100,
    }));
  }, [planes, totalEmpresas]);

  const modulosMasHabilitados = useMemo<ModuloUsage[]>(() => {
    return TODOS_LOS_MODULOS.map((modulo) => ({
      modulo,
      empresasConModulo: empresas.filter((empresa) =>
        empresa.modulos?.some((m) => m.modulo === modulo && m.isActive),
      ).length,
    }))
      .sort((a, b) => b.empresasConModulo - a.empresasConModulo)
      .slice(0, 4);
  }, [empresas]);

  const refetch = async () => {
    await Promise.all([refetchEmpresas(), refetchUsuarios(), fetchPlanes()]);
  };

  return {
    isLoading: isLoadingEmpresas || isLoadingUsuarios || isLoadingPlanes,
    error: errorEmpresas ?? errorUsuarios ?? errorPlanes,
    empresas,
    planes,
    totalEmpresas,
    empresasActivas,
    empresasEnTrial,
    totalUsuarios,
    usuariosActivos,
    promedioModulosPorEmpresa,
    totalModulosDisponibles: TODOS_LOS_MODULOS.length,
    distribucionPorPlan,
    modulosMasHabilitados,
    refetch,
  };
}
