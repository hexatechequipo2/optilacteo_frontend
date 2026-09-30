import { useEffect, useMemo, useState } from "react";
import { proveedoresService } from "../services/proveedores.service";
import type { EstabilidadProveedor, Proveedor } from "../types/proveedor.types";

// "ok" con estabilidad undefined = el backend respondió pero no mandó el
// bloque (se muestra "Sin datos suficientes"). "error" = la request falló
// (403, 500, red): no sabemos nada del proveedor, se muestra "No disponible".
export type EstadoFilaEstabilidad =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ok"; estabilidad: EstabilidadProveedor | undefined };

// HU-64: GET /proveedores no trae `estabilidad`, solo la ficha individual.
// Se pide GET /proveedores/:id en paralelo para los Tambo de la página
// visible (PAGE_SIZE chico, así que son pocas requests). Cada fila resuelve
// por su cuenta: un error en una no afecta a las demás ni a la tabla.
export function useEstabilidadProveedores(
  proveedores: Proveedor[],
): Map<number, EstadoFilaEstabilidad> {
  // Clave por ids ordenados: evita refetch cuando `proveedores` cambia de
  // identidad u orden pero no de contenido (ej. refetch del listado tras
  // editar, o reordenar la tabla). La estabilidad solo cambia al crear un
  // lote, no al editar el proveedor.
  const idsKey = useMemo(
    () =>
      proveedores
        .filter((p) => p.tipo === "tambo")
        .map((p) => p.id)
        .sort((a, b) => a - b)
        .join(","),
    [proveedores],
  );

  const [filas, setFilas] = useState<Map<number, EstadoFilaEstabilidad>>(
    () => new Map(),
  );

  useEffect(() => {
    const ids = idsKey ? idsKey.split(",").map(Number) : [];
    // Evita que la respuesta de una página anterior pise a la actual.
    let cancelado = false;
    setFilas(new Map(ids.map((id) => [id, { status: "loading" }])));

    ids.forEach((id) => {
      proveedoresService
        .getById(id)
        .then(
          (p): EstadoFilaEstabilidad => ({ status: "ok", estabilidad: p.estabilidad }),
          (): EstadoFilaEstabilidad => ({ status: "error" }),
        )
        .then((fila) => {
          if (cancelado) return;
          setFilas((prev) => new Map(prev).set(id, fila));
        });
    });

    return () => {
      cancelado = true;
    };
  }, [idsKey]);

  return filas;
}
