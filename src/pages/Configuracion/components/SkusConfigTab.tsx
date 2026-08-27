import { useState } from "react";
import { useSkus } from "../../../hooks/useSkus";
import { Button } from "../../../components/ui/Button";
import { NuevoSkuModal } from "./NuevoSkuModal";
import { UnidadMedidaSku } from "../../../types/sku.types";

const UNIDAD_LABELS: Record<UnidadMedidaSku, string> = {
  [UnidadMedidaSku.UNIDADES]: "Unidades",
  [UnidadMedidaSku.KG]: "kg",
};

// HU-67 (AC 2): alta de SKUs desde Configuración de empresa. Solo visible
// para Gerente (ver TABS_GERENTE en ConfiguracionPage.tsx) porque
// POST /skus en el backend está restringido a Administrador/Gerente y hoy
// Administrador no tiene acceso a la ruta /configuracion del frontend
// (gap preexistente, no de esta HU — ver comentario en App.tsx).
export function SkusConfigTab() {
  const { skus, isLoading, error, createSku, isCreating, refetch } = useSkus();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Catálogo de SKUs
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Productos terminados disponibles para registrar ingreso a cámara
          </p>
        </div>
        <Button type="button" className="!w-auto px-6" onClick={() => setIsModalOpen(true)}>
          + Nuevo SKU
        </Button>
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

      {isLoading ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Cargando catálogo de SKUs...
        </p>
      ) : skus.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          Todavía no diste de alta ningún SKU. Registrá el primero con el botón "+ Nuevo SKU".
        </p>
      ) : (
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="px-5 py-3 text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
                NOMBRE
              </th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
                UNIDAD DE MEDIDA
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {skus.map((sku) => (
              <tr key={sku.id} className="text-sm">
                <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                  {sku.nombre}
                </td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                  {UNIDAD_LABELS[sku.unidadMedida]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <NuevoSkuModal
        isOpen={isModalOpen}
        isSubmitting={isCreating}
        onClose={() => setIsModalOpen(false)}
        onCreate={createSku}
      />
    </div>
  );
}
