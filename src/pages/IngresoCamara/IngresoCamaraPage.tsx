import { useMemo, useState } from "react";
import { Layout } from "../../components/layout/Layout";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { INGRESOS_CAMARA_MOCK } from "./constants/ingresoCamaraMock";
import { IngresoCamaraFormModal } from "./IngresoCamaraFormModal";
import type { IngresoCamara } from "../../types/ingresoCamara.types";

const HEADERS = ["SKU", "CANTIDAD", "LOTE DE ORIGEN", "FECHA"];

const TODOS_LOS_SKUS = "__todos__";

// HU-67 Parte 2/2: maquetado del formulario "Nuevo ingreso a cámara". El
// modal valida en el cliente y agrega la fila al array mock local (sin
// llamar a ningún endpoint) — falta conectar al backend real.
export default function IngresoCamaraPage() {
  const [ingresos, setIngresos] = useState<IngresoCamara[]>(INGRESOS_CAMARA_MOCK);
  const [skuFiltro, setSkuFiltro] = useState(TODOS_LOS_SKUS);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const skuOptions = useMemo(() => {
    const skusUnicos = Array.from(new Set(ingresos.map((i) => i.sku)));
    return [
      { value: TODOS_LOS_SKUS, label: "Todos los SKUs" },
      ...skusUnicos.map((sku) => ({ value: sku, label: sku })),
    ];
  }, [ingresos]);

  const ingresosFiltrados = useMemo(() => {
    if (skuFiltro === TODOS_LOS_SKUS) return ingresos;
    return ingresos.filter((i) => i.sku === skuFiltro);
  }, [ingresos, skuFiltro]);

  const handleNuevoIngreso = (nuevoIngreso: Omit<IngresoCamara, "id">) => {
    setIngresos((prev) => [{ id: crypto.randomUUID(), ...nuevoIngreso }, ...prev]);
  };

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

      <IngresoCamaraFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleNuevoIngreso}
      />
    </Layout>
  );
}
