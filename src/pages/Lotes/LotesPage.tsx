import { useEffect, useState } from "react";
import { Layout } from "../../components/layout/Layout";
import { Button } from "../../components/ui/Button";
import { useLotes } from "../../hooks/useLotes";
import { useAuth } from "../../hooks/useAuth";
import { proveedoresService } from "../../services/proveedores.service";
import { TIPO_MATERIA_PRIMA_TABS } from "../Configuracion/constants/parametrosCalidad";
import { ClasificacionLote, DestinoLote } from "../../types/lote.types";
import type { Proveedor } from "../../types/proveedor.types";
import { LoteFormModal } from "./LoteFormModal";

// Universo suficiente para poblar el selector de proveedores del formulario
// (no es una tabla paginada: acá se necesita el catálogo completo).
const PROVEEDORES_SELECT_LIMIT = 100;

const CLASIFICACION_LABEL: Record<ClasificacionLote, string> = {
  [ClasificacionLote.PRIMERA]: "Primera",
  [ClasificacionLote.SEGUNDA]: "Segunda",
  [ClasificacionLote.TERCERA]: "Tercera",
  [ClasificacionLote.RECHAZADO]: "Rechazado",
};

const CLASIFICACION_CLASS: Record<ClasificacionLote, string> = {
  [ClasificacionLote.PRIMERA]: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  [ClasificacionLote.SEGUNDA]: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  [ClasificacionLote.TERCERA]: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  [ClasificacionLote.RECHAZADO]: "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

const DESTINO_LABEL: Record<DestinoLote, string> = {
  [DestinoLote.PRODUCCION]: "Producción",
  [DestinoLote.ALMACENAMIENTO]: "Almacenamiento",
  [DestinoLote.TRATAMIENTO]: "Tratamiento",
  [DestinoLote.DESCARTE]: "Descarte",
};

const HEADERS = ["LOTE", "PROVEEDOR", "MATERIA PRIMA", "INGRESO", "CLASIFICACIÓN", "DESTINO"];

const TIPO_MATERIA_PRIMA_LABEL = new Map(TIPO_MATERIA_PRIMA_TABS.map((t) => [t.value, t.label]));

export default function LotesPage() {
  const { lotes, isLoading, error, refetch, createLote, isCreating } = useLotes();
  const { user } = useAuth();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Solo Responsable de calidad puede registrar lotes (POST /lotes en el
  // backend); Gerente/Administrador acceden a esta pantalla en modo lectura.
  const puedeCrearLote = user?.rolNombre === "Responsable de calidad";

  useEffect(() => {
    proveedoresService
      .getAll({ page: 1, limit: PROVEEDORES_SELECT_LIMIT })
      .then((result) => setProveedores(result.data))
      .catch(() => setProveedores([]));
  }, []);

  const proveedorMap = new Map(proveedores.map((p) => [p.id, p.razonSocial]));

  return (
    <Layout breadcrumb="Consola > Lotes">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Lotes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {lotes.length} lotes registrados
          </p>
        </div>
        {puedeCrearLote && (
          <Button type="button" className="!w-auto px-6" onClick={() => setIsModalOpen(true)}>
            + Nuevo lote
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
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

      {isLoading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando lotes...</p>
        </div>
      ) : lotes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-base font-medium text-slate-700 dark:text-slate-300">
            No hay lotes registrados
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {puedeCrearLote
              ? 'Registrá el primer lote recibido con el botón "+ Nuevo lote".'
              : "Todavía no hay lotes registrados por Responsable de calidad."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
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
              {lotes.map((lote) => (
                <tr key={lote.id} className="text-sm">
                  <td className="px-5 py-3 font-mono text-xs font-medium text-slate-900 dark:text-white">
                    {lote.codigo}
                  </td>
                  <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                    {proveedorMap.get(lote.proveedorId) ?? `Proveedor #${lote.proveedorId}`}
                  </td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                    {TIPO_MATERIA_PRIMA_LABEL.get(lote.materiaPrima) ?? lote.materiaPrima}
                  </td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                    {new Date(lote.fechaIngreso).toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-5 py-3">
                    {lote.clasificacion ? (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${CLASIFICACION_CLASS[lote.clasificacion]}`}
                      >
                        {CLASIFICACION_LABEL[lote.clasificacion]}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                    {lote.destinoInicial ? DESTINO_LABEL[lote.destinoInicial] : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {puedeCrearLote && (
        <LoteFormModal
          isOpen={isModalOpen}
          proveedores={proveedores}
          isSubmitting={isCreating}
          onClose={() => setIsModalOpen(false)}
          onSubmit={createLote}
        />
      )}
    </Layout>
  );
}
