import { useMemo } from "react";
import { Layout } from "../../components/layout/Layout";
import { usePlanes } from "../../hooks/usePlanes";
import { PlanCard } from "./PlanCard";

export default function PlanesPage() {
  const { planes, isLoading, error, fetchPlanes } = usePlanes();

  const totalEmpresas = useMemo(
    () => planes.reduce((sum, p) => sum + p.empresasAsignadas, 0),
    [planes],
  );

  return (
    <Layout breadcrumb="Consola > Planes">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Planes
        </h1>
        <p className="text-sm text-slate-500">
          {planes.length} planes de suscripción · {totalEmpresas} empresas
          asignadas
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchPlanes()}
            className="ml-4 rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-200"
          >
            Reintentar
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-80 animate-pulse rounded-xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : planes.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16">
          <p className="text-sm text-slate-500">No hay planes registrados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {planes.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </Layout>
  );
}
