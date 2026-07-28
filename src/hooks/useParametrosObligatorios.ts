import { useMemo } from "react";
import { Parametro, type TipoMateriaPrima } from "../types/configParametro.types";

export interface ParametroObligatorioInfo {
  obligatorio: boolean;
  rango?: { min: number; max: number };
}

interface UseParametrosObligatoriosResult {
  // false mientras GET /config-parametros no esté habilitado para el rol
  // que carga el form (hoy solo Gerente). Ver comentario abajo.
  disponible: boolean;
  infoPorParametro: Record<Parametro, ParametroObligatorioInfo>;
}

// TODO(backend): GET /config-parametros es la única fuente de qué parámetros
// son obligatorios (y sus rangos) por empresa + tipo de materia prima, pero
// el controller lo restringe a @Roles(GERENTE). Operario de línea -el único
// rol habilitado para el POST de HU-20- no puede llamarlo hoy, así que este
// hook no pega al backend: es un seam para no acoplar
// RegistrarMedicionManualTab a la fuente de datos. Si el back habilita el rol
// más adelante, alcanza con reemplazar el cuerpo de este hook por un fetch a
// configParametroService.getAll() (ver useConfigParametros.ts) filtrado por
// tipoMateriaPrima, sin tocar el form que lo consume.
export function useParametrosObligatorios(
  _tipoMateriaPrima: TipoMateriaPrima,
): UseParametrosObligatoriosResult {
  const infoPorParametro = useMemo(() => {
    return Object.values(Parametro).reduce(
      (acc, parametro) => {
        acc[parametro] = { obligatorio: false };
        return acc;
      },
      {} as Record<Parametro, ParametroObligatorioInfo>,
    );
  }, []);

  return { disponible: false, infoPorParametro };
}
