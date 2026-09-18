import { useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import { Input } from "../../../components/ui/Input";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import {
  useCatalogoDestinosProductivos,
  type DestinoProductivoConfigurable,
} from "../../../hooks/useCatalogoDestinosProductivos";

// HU-34 (Sprint 4, mock visual): administración del catálogo de destinos
// productivos (queso, yogur, crema, dulce de leche, etc.). El backend solo
// tiene GET /destinos-productivos (catálogo de lectura, HU-49) — todavía
// no hay alta, edición ni baja, así que esos tres se resuelven acá con
// overrides locales (ver useCatalogoDestinosProductivos.ts) combinados con
// el catálogo real. Alta/edición/baja quedan restringidas a Gerente, igual
// que el catálogo de SKUs (ver SkusConfigTab.tsx) — el resto de los roles
// que llegan a esta pestaña la ven en modo lectura.
interface DestinosProductivosConfigTabProps {
  puedeAdministrar: boolean;
}

export function DestinosProductivosConfigTab({
  puedeAdministrar,
}: DestinosProductivosConfigTabProps) {
  const {
    destinos,
    isLoading,
    error,
    refetch,
    crear,
    editar,
    desactivar,
    reactivar,
  } = useCatalogoDestinosProductivos();
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nombreEditado, setNombreEditado] = useState("");

  const handleCrear = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nombre = nuevoNombre.trim();
    if (!nombre) return;
    crear(nombre);
    setNuevoNombre("");
  };

  const empezarEdicion = (destino: DestinoProductivoConfigurable) => {
    setEditandoId(destino.id);
    setNombreEditado(destino.nombre);
  };

  const guardarEdicion = (id: number) => {
    const nombre = nombreEditado.trim();
    if (nombre) editar(id, nombre);
    setEditandoId(null);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Destinos productivos
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Catálogo configurable que se usa al asignar el destino productivo de
            un lote
          </p>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-4 flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="ml-4 rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
          >
            Reintentar
          </button>
        </div>
      )}

      {puedeAdministrar && (
        <form
          onSubmit={handleCrear}
          className="flex flex-wrap items-end gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800"
        >
          <div className="min-w-[220px] flex-1">
            <Input
              id="nuevo-destino-productivo"
              label="Nuevo destino"
              placeholder="Ej: Ricota"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
            />
          </div>
          <Button type="submit" className="!w-auto px-6">
            + Agregar destino
          </Button>
        </form>
      )}

      {isLoading ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Cargando catálogo de destinos productivos...
        </p>
      ) : destinos.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Todavía no hay destinos productivos configurados.
        </p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="px-5 py-3 text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
                NOMBRE
              </th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
                ESTADO
              </th>
              {puedeAdministrar && <th className="px-5 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {destinos.map((destino) => (
              <tr key={destino.id} className="text-sm">
                <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                  {editandoId === destino.id ? (
                    <input
                      autoFocus
                      value={nombreEditado}
                      onChange={(e) => setNombreEditado(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") guardarEdicion(destino.id);
                        if (e.key === "Escape") setEditandoId(null);
                      }}
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  ) : (
                    <>
                      {destino.nombre}
                      {destino.esLocal && (
                        <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-500">
                          (agregado localmente)
                        </span>
                      )}
                    </>
                  )}
                </td>
                <td className="px-5 py-3">
                  <Badge variant={destino.activo ? "success" : "neutral"}>
                    {destino.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </td>
                {puedeAdministrar && (
                  <td className="px-5 py-3 text-right">
                    {editandoId === destino.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => guardarEdicion(destino.id)}
                          className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditandoId(null)}
                          className="text-xs font-medium text-slate-500 hover:underline dark:text-slate-400"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => empezarEdicion(destino)}
                          className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                          title="Editar nombre"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            destino.activo
                              ? desactivar(destino.id)
                              : reactivar(destino.id)
                          }
                          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          {destino.activo ? "Desactivar" : "Reactivar"}
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
