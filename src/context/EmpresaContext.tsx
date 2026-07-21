import { createContext, useCallback, useEffect, useState, type ReactNode } from "react";
import { empresasService } from "../services/empresa.service";
import type { EmpresaType } from "../types/empresa.types";
import { useAuth } from "../hooks/useAuth";

interface EmpresaContextType {
  empresa: EmpresaType | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined);

// Un usuario Administrador no pertenece a ninguna empresa (tenant.empresaId
// es null en el backend), así que /empresa/me devolvería 404 para ese rol.
export function EmpresaProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const tienePropiaEmpresa = isAuthenticated && user?.rolNombre !== "Administrador";

  const [empresa, setEmpresa] = useState<EmpresaType | null>(null);
  const [isLoading, setIsLoading] = useState(tienePropiaEmpresa);
  const [error, setError] = useState<string | null>(null);

  const fetchEmpresa = useCallback(async () => {
    if (!tienePropiaEmpresa) {
      setEmpresa(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await empresasService.getMine();
      setEmpresa(data);
    } catch {
      setError("No se pudo cargar la información de tu empresa.");
    } finally {
      setIsLoading(false);
    }
    // user?.id: si loguea otro usuario en la misma sesión de la SPA (sin
    // recarga completa de página) esto fuerza un refetch aunque la condición
    // booleana tienePropiaEmpresa dé el mismo valor para ambos (ej: dos
    // Gerentes de empresas distintas).
  }, [tienePropiaEmpresa, user?.id]);

  useEffect(() => {
    // Logout: limpiar antes que nada, para que un próximo login no arrastre
    // ni por un instante el logo/nombre de la cuenta anterior.
    if (!isAuthenticated) {
      setEmpresa(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    fetchEmpresa();
  }, [isAuthenticated, fetchEmpresa]);

  return (
    <EmpresaContext.Provider value={{ empresa, isLoading, error, refetch: fetchEmpresa }}>
      {children}
    </EmpresaContext.Provider>
  );
}
