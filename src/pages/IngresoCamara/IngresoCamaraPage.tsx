import { useMemo, useState } from "react";
import { Layout } from "../../components/layout/Layout";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { IngresoCamaraFormModal } from "./IngresoCamaraFormModal";
import { useSkus } from "../../hooks/useSkus";
import { useIngresoCamara } from "../../hooks/useIngresoCamara";
import { UnidadMedidaSku } from "../../types/sku.types";

const HEADERS = ["SKU", "CANTIDAD", "LOTE DE ORIGEN", "FECHA"];

const TODOS_LOS_SKUS = "";

const UNIDAD_LABELS: Record<UnidadMedidaSku, string> = {
  [UnidadMedidaSku.UNIDADES]: "unidades",
  [UnidadMedidaSku.KG]: "kg",
};

function formatearFechaIngreso(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { timeZone: "UTC" });
}

// HU-67: conectado al catálogo de SKU real (GET /skus) y al endpoint real
// de ingreso a cámara (GET/POST /ingresos-camara). El filtro por SKU del
// historial pega server-side (?skuId=...), no es más un filtro en memoria.
export default function IngresoCamaraPage() {
  const { skus } = useSkus();
  const [skuFiltro, setSkuFiltro] = useState<string>(TODOS_LOS_SKUS);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const skuFiltroId = skuFiltro === TODOS_LOS_SKUS ? undefined : Number(skuFiltro);
  const { ingresos, isLoading, error, createIngreso, isCreating, refetch } =
    useIngresoCamara(skuFiltroId);

  const unidadPorSkuId = useMemo(() => {
    const map = new Map<number, UnidadMedidaSku>();
    skus.forEach((sku) => map.set(sku.id, sku.unidadMedida));
    return map;
  }, [skus]);

  const skuOptions = useMemo(
    () => [
      { value: TODOS_LOS_SKUS, label: "Todos los SKUs" },
      ...skus.map((sku) => ({ value: String(sku.id), label: sku.nombre })),
    ],
    [skus],
  );

  return (
    <Layout breadcrumb="Consola > Ingreso a cámara">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Ingreso a cámara · Producto terminado
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Registro de SKUs listos para almacenamiento en cámara
          </p>
        </div>
        <Button type="button" className="!w-auto px-6" onClick={() => setIsModalOpen(true)}>
          + Nuevo ingreso
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Historial de ingresos a cámara
          </h2>
          <div className="w-full sm:w-56">
            <Select
              id="ingreso-camara-filtro-sku"
              label="SKU"
              value={skuFiltro}
              onChange={(e) => setSkuFiltro(e.target.value)}
              options={skuOptions}
            />
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

        {isLoading ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Cargando ingresos a cámara...
          </p>
        ) : (
          <>
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
                {ingresos.map((ingreso) => (
                  <tr key={ingreso.id} className="text-sm">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                      {ingreso.skuNombre ?? `SKU #${ingreso.skuId}`}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {ingreso.cantidad} {UNIDAD_LABELS[unidadPorSkuId.get(ingreso.skuId) ?? UnidadMedidaSku.UNIDADES]}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {ingreso.loteCodigo ?? "Sin referencia"}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {formatearFechaIngreso(ingreso.fechaIngreso)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {ingresos.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                No hay ingresos registrados para este SKU.
              </p>
            )}
          </>
        )}
      </div>

      <IngresoCamaraFormModal
        isOpen={isModalOpen}
        isSubmitting={isCreating}
        skus={skus}
        onClose={() => setIsModalOpen(false)}
        onCreate={createIngreso}
      />
    </Layout>
  );
}
