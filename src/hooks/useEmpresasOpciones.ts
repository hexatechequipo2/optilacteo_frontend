import { useEffect, useState } from "react";
import { empresasService } from "../services/empresa.service";
import type { EmpresaType } from "../types/empresa.types";

// HU-72: lista liviana de empresas para los selectores del Administrador
// (Usuarios y Roles operan sobre la empresa elegida con ?empresaId=).
// GET /empresa exige plataforma:ver; limit=100 por el @Max(100) de
// PaginationQueryDto en el back.
export function useEmpresasOpciones({ habilitado = true }: { habilitado?: boolean } = {}) {
  const [empresas, setEmpresas] = useState<EmpresaType[]>([]);
  const [isLoading, setIsLoading] = useState(habilitado);

  useEffect(() => {
    if (!habilitado) {
      setEmpresas([]);
      setIsLoading(false);
      return;
    }
    let cancelado = false;
    setIsLoading(true);
    empresasService
      .getAll({ page: 1, limit: 100 })
      .then((res) => {
        if (!cancelado) setEmpresas(res.data);
      })
      .catch(() => {
        if (!cancelado) setEmpresas([]);
      })
      .finally(() => {
        if (!cancelado) setIsLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, [habilitado]);

  return { empresas, isLoading };
}
