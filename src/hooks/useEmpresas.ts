import { useCallback, useEffect, useState } from "react";
import { empresasService, type CreateEmpresaDto } from "../services/empresa.service";
import type { EmpresaType, UpdateEmpresaDto } from "../types/empresa.types";

export interface Meta {
  page: number;
  limit: number;
  total: number;
  lastPage: number;
}

interface UseEmpresasResult {
  empresas: EmpresaType[];
  meta: Meta;
  page: number;
  setPage: (page: number) => void;
  busqueda: string;
  setBusqueda: (q: string) => void;
  cuit: string;
  setCuit: (q: string) => void;
  plan: string;
  setPlan: (q: string) => void;
  tabActivo: string;
  setTabActivo: (tab: string) => void;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createEmpresa: (dto: CreateEmpresaDto) => Promise<void>;
  isCreating: boolean;
  updateEmpresa: (id: number, dto: UpdateEmpresaDto, nuevoEstado: boolean) => Promise<void>;
  isUpdating: boolean;
}

export function useEmpresas(soloMiEmpresa = false): UseEmpresasResult {
  const [empresas, setEmpresas] = useState<EmpresaType[]>([]);
  const [meta, setMeta] = useState<Meta>({ page: 1, limit: 10, total: 0, lastPage: 1 });
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [cuit, setCuit] = useState("");
  const [plan, setPlan] = useState("");
  const [tabActivo, setTabActivo] = useState("Todas");
  
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEmpresas = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    const planesValidos = ["starter", "pro", "enterprise"];
    const busquedaNormalizada = busqueda.trim();
    
    // Determinamos qué estamos buscando
    const esPlan = planesValidos.includes(busquedaNormalizada.toLowerCase());
    const esCuit = /^\d{2}-\d{8}-\d{1}$/.test(busquedaNormalizada); // Ejemplo de validación simple de CUIT

    try {
      const response = await empresasService.getAll({ 
        page, 
        limit: 5, 
        // Enviamos solo el parámetro que corresponde a la búsqueda
        name: (!esPlan && !esCuit) ? busquedaNormalizada || undefined : undefined,
        plan: esPlan ? busquedaNormalizada.toLowerCase() : undefined,
        cuit: esCuit ? busquedaNormalizada : undefined,
        isActive: tabActivo === "Activas" ? true : tabActivo === "Suspendidas" ? false : undefined
      });

      setEmpresas(response.data);
      setMeta({
        ...response.meta,
        lastPage: response.meta.totalPages 
      });
    } catch (err) {
      setError("No se pudieron cargar las empresas.");
    } finally {
      setIsLoading(false);
    }
  }, [soloMiEmpresa, page, busqueda, tabActivo]);

  // Resetear a página 1 cuando los filtros cambian
  useEffect(() => {
    setPage(1);
  }, [busqueda, tabActivo]);

  useEffect(() => {
    fetchEmpresas();
  }, [fetchEmpresas]);

  const createEmpresa = useCallback(async (dto: CreateEmpresaDto) => {
    setIsCreating(true);
    try {
      await empresasService.create(dto);
      await fetchEmpresas();
    } finally {
      setIsCreating(false);
    }
  }, [fetchEmpresas]);

  const updateEmpresa = useCallback(async (id: number, dto: UpdateEmpresaDto, nuevoEstado: boolean) => {
    setIsUpdating(true);
    try {
      const empresaActual = empresas.find((e) => e.id === id);
      await empresasService.update(id, dto);

      if (empresaActual && empresaActual.isActive !== nuevoEstado) {
        if (nuevoEstado) await empresasService.activate(id);
        else await empresasService.deactivate(id);
      }
      await fetchEmpresas();
    } finally {
      setIsUpdating(false);
    }
  }, [empresas, fetchEmpresas]);

  return {
    empresas,
    meta,
    page,
    setPage,
    busqueda,
    setBusqueda,
    cuit,
    setCuit,
    plan,
    setPlan,
    tabActivo,
    setTabActivo,
    isLoading,
    error,
    refetch: fetchEmpresas,
    createEmpresa,
    isCreating,
    updateEmpresa,
    isUpdating,
  };
}