import { useMemo, useState } from "react";
import { Layout } from "../../components/layout/Layout";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { INGRESOS_CAMARA_MOCK } from "./constants/ingresoCamaraMock";

const HEADERS = ["SKU", "CANTIDAD", "LOTE DE ORIGEN", "FECHA"];

const TODOS_LOS_SKUS = "__todos__";

// HU-67 Parte 1/2: solo maquetado. La tabla filtra el array mock en el
// cliente y el botón "+ Nuevo ingreso" todavía no abre nada — eso, junto con
// la conexión al backend real, queda para la Parte 2/2.
export default function IngresoCamaraPage() {
  const [skuFiltro, setSkuFiltro] = useState(TODOS_LOS_SKUS);

  const skuOptions = useMemo(() => {
    const skusUnicos = Array.from(new Set(INGRESOS_CAMARA_MOCK.map((i) => i.sku)));
    return [
      { value: TODOS_LOS_SKUS, label: "Todos los SKUs" },
      ...skusUnicos.map((sku) => ({ value: sku, label: sku })),
    ];
  }, []);

  const ingresosFiltrados = useMemo(() => {
    if (skuFiltro === TODOS_LOS_SKUS) return INGRESOS_CAMARA_MOCK;
    return INGRESOS_CAMARA_MOCK.filter((i) => i.sku === skuFiltro);
  }, [skuFiltro]);

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
        <Button type="button" className="!w-auto px-6">
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
            {ingresosFiltrados.map((ingreso) => (
              <tr key={ingreso.id} className="text-sm">
                <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                  {ingreso.sku}
                </td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                  {ingreso.cantidad} {ingreso.unidad}
                </td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                  {ingreso.loteOrigen}
                </td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                  {ingreso.fecha}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {ingresosFiltrados.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No hay ingresos registrados para este SKU.
          </p>
        )}
      </div>
    </Layout>
  );
}
