import { useEffect, useState } from "react";
import { empresasService } from "../services/empresa.service";
import type { EmpresaType } from "../types/empresa.types";

interface UseEmpresasResult {
  empresas: EmpresaType[];
  isLoading: boolean;
  error: string | null;
}

export function useEmpresas(): UseEmpresasResult {
  const [empresas, setEmpresas] = useState<EmpresaType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchEmpresas() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await empresasService.getAll();
        if (isMounted) setEmpresas(data);
      } catch {
        if (isMounted) setError("No se pudieron cargar las empresas.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchEmpresas();
    return () => {
      isMounted = false;
    };
  }, []);

  return { empresas, isLoading, error };
}