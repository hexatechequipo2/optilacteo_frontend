import { useEffect, useState } from "react";
import { proveedoresService } from "../services/proveedores.service";
import { tamboService } from "../services/tambo.service";
import type { Proveedor } from "../types/proveedor.types";
import type { Tambo } from "../types/tambo.types";

interface UseOpcionesFiltroLotesResult {
  proveedores: Proveedor[];
  tambos: Tambo[];
  errorProveedores: boolean;
  errorTambos: boolean;
}

// Tope de PaginationQueryDto en el back. Una empresa con más de 100
// proveedores vería el combo truncado.
const LIMITE_PROVEEDORES = 100;

// HU-77: opciones de los filtros Proveedor y Tambo, por id. Se cargan una
// vez y por separado: si una falla, el otro filtro sigue usable.
// TODO(backend): GET /proveedores exige RECEPCION:ver y la consulta
// TRAZABILIDAD:ver. Un rol con trazabilidad sin recepción (matriz editada
// por el Gerente) no puede cargar el combo de proveedores; queda
// deshabilitado y el listado funciona igual.
export function useOpcionesFiltroLotes(): UseOpcionesFiltroLotesResult {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [tambos, setTambos] = useState<Tambo[]>([]);
  const [errorProveedores, setErrorProveedores] = useState(false);
  const [errorTambos, setErrorTambos] = useState(false);

  useEffect(() => {
    let activo = true;
    proveedoresService
      .getAll({ page: 1, limit: LIMITE_PROVEEDORES })
      .then((r) => activo && setProveedores(r.data))
      .catch(() => activo && setErrorProveedores(true));
    tamboService
      .getAll()
      .then((r) => activo && setTambos(r))
      .catch(() => activo && setErrorTambos(true));
    return () => {
      activo = false;
    };
  }, []);

  return { proveedores, tambos, errorProveedores, errorTambos };
}
