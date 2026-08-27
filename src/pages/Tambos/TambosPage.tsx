import { useEffect, useMemo, useState } from "react";
import { Pencil, Power, PowerOff } from "lucide-react";
import { Layout } from "../../components/layout/Layout";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { useTambosCatalogo } from "../../hooks/useTambos";
import { useAuth } from "../../hooks/useAuth";
import { proveedoresService } from "../../services/proveedores.service";
import { extraerMensajeError } from "../../services/tambo.service";
import type { Proveedor } from "../../types/proveedor.types";
import type { Tambo } from "../../types/tambo.types";
import { TamboFormModal } from "./TamboFormModal";

// Universo suficiente para poblar el selector de proveedores del formulario
// y el filtro de la tabla (mismo criterio que LotesPage.tsx).
const PROVEEDORES_SELECT_LIMIT = 100;

const HEADERS = ["NOMBRE", "PROVEEDOR", "UBICACIÓN", "ESTADO", ""];

const ESTADO_CLASS: Record<"activo" | "inactivo", string> = {
  activo: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  inactivo: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const ESTADO_DOT: Record<"activo" | "inactivo", string> = {
  activo: "bg-green-500",
  inactivo: "bg-slate-400",
};

export default function TambosPage() {
  const { tambos, isLoading, error, refetch, createTambo, isCreating, updateTambo, isUpdating, activarTambo, darDeBajaTambo, cambiandoEstadoId } =
    useTambosCatalogo();
  const { user } = useAuth();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [filtroProveedorId, setFiltroProveedorId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tamboEnEdicion, setTamboEnEdicion] = useState<Tambo | null>(null);
  const [errorEstado, setErrorEstado] = useState("");

  const rol = (user?.rolNombre ?? "").trim().toLowerCase();
  // POST /tambos (backend, tambo.controller.ts): @Roles(OPERARIO_LINEA, GERENTE)
  // — a propósito no incluye Administrador ni Responsable de Calidad.
  const puedeCrearTambo = rol === "operario de línea" || rol === "gerente";
  // PATCH /tambos/:id, PATCH /tambos/:id/activar y DELETE /tambos/:id:
  // @Roles(GERENTE, ADMINISTRADOR) en los tres. Mismo set para editar y
  // para cambiar el estado (activar/dar de baja).
  const puedeEditarTambo = rol === "gerente" || rol === "administrador";

  useEffect(() => {
    proveedoresService
      .getAll({ page: 1, limit: PROVEEDORES_SELECT_LIMIT, estado: "activa" })
      .then((result) => setProveedores(result.data))
      .catch(() => setProveedores([]));
  }, []);

  const proveedorMap = useMemo(
    () => new Map(proveedores.map((p) => [p.id, p.razonSocial])),
    [proveedores],
  );

  const filtroOptions = [
    { value: "", label: "Todos los proveedores" },
    ...proveedores.map((p) => ({ value: String(p.id), label: p.razonSocial })),
  ];

  const tambosFiltrados = useMemo(() => {
    if (!filtroProveedorId) return tambos;
    return tambos.filter((t) => t.proveedorId === Number(filtroProveedorId));
  }, [tambos, filtroProveedorId]);

  const abrirAlta = () => {
    setTamboEnEdicion(null);
    setIsModalOpen(true);
  };

  const abrirEdicion = (tambo: Tambo) => {
    setTamboEnEdicion(tambo);
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setIsModalOpen(false);
    setTamboEnEdicion(null);
  };

  const cambiarEstado = async (tambo: Tambo) => {
    setErrorEstado("");
    try {
      if (tambo.activo) {
        await darDeBajaTambo(tambo.id);
      } else {
        await activarTambo(tambo.id);
      }
    } catch (err) {
      setErrorEstado(
        extraerMensajeError(err, "No se pudo cambiar el estado del tambo. Intentá nuevamente."),
      );
    }
  };

  return (
    <Layout breadcrumb="Consola > Tambos">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Tambos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {tambosFiltrados.length} tambos registrados
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Select
            id="filtro-proveedor"
            label="Proveedor"
            options={filtroOptions}
            value={filtroProveedorId}
            onChange={(e) => setFiltroProveedorId(e.target.value)}
            className="!py-1.5 text-sm"
          />
          {puedeCrearTambo && (
            <Button type="button" className="!w-auto px-6" onClick={abrirAlta}>
              + Nuevo tambo
            </Button>
          )}
        </div>
      </div>

      {(error || errorEstado) && (
        <div className="mb-4 flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
          <span>{errorEstado || error}</span>
          {error && !errorEstado && (
            <button
              type="button"
              onClick={() => void refetch()}
              className="ml-4 rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
            >
              Reintentar
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando tambos...</p>
        </div>
      ) : tambos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-base font-medium text-slate-700 dark:text-slate-300">
            No hay tambos registrados
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {puedeCrearTambo
              ? 'Registrá el primer tambo de origen con el botón "+ Nuevo tambo".'
              : "Todavía no hay tambos registrados por Operario de línea o Gerente."}
          </p>
        </div>
      ) : tambosFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-base font-medium text-slate-700 dark:text-slate-300">
            Ningún tambo coincide con el filtro
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Probá con otro proveedor o elegí "Todos los proveedores".
          </p>
        </div>
      ) : (
        <>
          {/* Tabla (md+) */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  {HEADERS.map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tambosFiltrados.map((tambo) => {
                  const estado = tambo.activo ? "activo" : "inactivo";
                  return (
                    <tr key={tambo.id} className="text-sm">
                      <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                        {tambo.nombre}
                      </td>
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                        {proveedorMap.get(tambo.proveedorId) ?? `Proveedor #${tambo.proveedorId}`}
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                        {tambo.ubicacion ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_CLASS[estado]}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${ESTADO_DOT[estado]}`} />
                          {tambo.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {puedeEditarTambo && (
                            <button
                              type="button"
                              onClick={() => abrirEdicion(tambo)}
                              aria-label={`Editar ${tambo.nombre}`}
                              className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                              title="Editar tambo"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {puedeEditarTambo && (
                            <button
                              type="button"
                              onClick={() => cambiarEstado(tambo)}
                              disabled={cambiandoEstadoId === tambo.id}
                              aria-label={tambo.activo ? `Dar de baja ${tambo.nombre}` : `Reactivar ${tambo.nombre}`}
                              className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                              title={tambo.activo ? "Dar de baja" : "Reactivar"}
                            >
                              {tambo.activo ? (
                                <PowerOff className="h-4 w-4" />
                              ) : (
                                <Power className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards (mobile) */}
          <div className="flex flex-col gap-3 md:hidden">
            {tambosFiltrados.map((tambo) => {
              const estado = tambo.activo ? "activo" : "inactivo";
              return (
                <div
                  key={tambo.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900 dark:text-white">
                        {tambo.nombre}
                      </p>
                      <p className="truncate text-sm text-slate-700 dark:text-slate-300">
                        {proveedorMap.get(tambo.proveedorId) ?? `Proveedor #${tambo.proveedorId}`}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {puedeEditarTambo && (
                        <button
                          type="button"
                          onClick={() => abrirEdicion(tambo)}
                          aria-label={`Editar ${tambo.nombre}`}
                          className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {puedeEditarTambo && (
                        <button
                          type="button"
                          onClick={() => cambiarEstado(tambo)}
                          disabled={cambiandoEstadoId === tambo.id}
                          aria-label={tambo.activo ? `Dar de baja ${tambo.nombre}` : `Reactivar ${tambo.nombre}`}
                          className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                        >
                          {tambo.activo ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_CLASS[estado]}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${ESTADO_DOT[estado]}`} />
                      {tambo.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  <dl className="grid grid-cols-1 gap-y-2 text-xs">
                    <div>
                      <dt className="text-slate-400 dark:text-slate-500">Ubicación</dt>
                      <dd className="text-slate-600 dark:text-slate-400">
                        {tambo.ubicacion ?? "—"}
                      </dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>
        </>
      )}

      {(puedeCrearTambo || puedeEditarTambo) && (
        <TamboFormModal
          isOpen={isModalOpen}
          proveedores={proveedores}
          tambo={tamboEnEdicion ?? undefined}
          isSubmitting={tamboEnEdicion ? isUpdating : isCreating}
          onClose={cerrarModal}
          onCreate={createTambo}
          onUpdate={updateTambo}
        />
      )}
    </Layout>
  );
}
