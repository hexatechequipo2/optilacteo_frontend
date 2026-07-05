import { useMemo, useState } from "react";
import { Search, Pencil } from "lucide-react";
import { Layout } from "../../components/layout/Layout";
import { Button } from "../../components/ui/Button";
import { useProveedores } from "../../hooks/useProveedores";
import { useEmpresas } from "../../hooks/useEmpresas";
import { useAuth } from "../../hooks/useAuth";
import { ProveedorFormModal } from "./ProveedorFormModal";
import type { Proveedor, TipoProveedor } from "../../types/proveedor.types";

type TabTipo = "Todos" | "Tambo" | "Transporte" | "Insumos" | "Laboratorio";

const TABS: TabTipo[] = ["Todos", "Tambo", "Transporte", "Insumos", "Laboratorio"];

const TAB_TO_TIPO: Record<string, TipoProveedor> = {
  Tambo: "tambo",
  Transporte: "transporte",
  Insumos: "insumos",
  Laboratorio: "laboratorio",
};

const TIPO_LABEL: Record<string, string> = {
  tambo: "Tambo",
  transporte: "Transporte",
  insumos: "Insumos",
  laboratorio: "Laboratorio",
};

const TIPO_CLASS: Record<string, string> = {
  tambo: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  transporte: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  insumos: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  laboratorio: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
};

const ESTADO_CLASS: Record<string, string> = {
  activa: "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  trial: "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  suspendida: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const ESTADO_DOT: Record<string, string> = {
  activa: "bg-green-500",
  trial: "bg-blue-500",
  suspendida: "bg-slate-400",
};

const HEADERS = ["PROVEEDOR", "TIPO", "EMPRESA", "CAPACIDAD", "UBICACIÓN", "ESTADO", ""];

function getInitials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase();
}

function capacidadLabel(p: Proveedor): string {
  if (p.capacidad === null || p.capacidad === undefined) return "—";
  if (p.tipo === "tambo") return `${p.capacidad} L/día`;
  if (p.tipo === "transporte") return `${p.capacidad} viajes/sem`;
  return String(p.capacidad);
}

export default function ProveedoresPage() {
  const {
    proveedores,
    isLoading,
    error,
    fetchProveedores,
    createProveedor,
    isCreating,
    updateProveedor,
    isUpdating,
  } = useProveedores();
  const { user } = useAuth();

  const esGerente =
    (user?.rolNombre ?? "").trim().toLowerCase() === "gerente";

  // Administrador -> GET /empresa (todas). Gerente -> GET /empresa/me
  // (solo la propia, envuelta en un array de un elemento).
  const { empresas } = useEmpresas(esGerente);

  const [busqueda, setBusqueda] = useState("");
  const [tabActivo, setTabActivo] = useState<TabTipo>("Todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [proveedorEnEdicion, setProveedorEnEdicion] = useState<Proveedor | null>(null);

  const empresaMap = useMemo(
    () => new Map(empresas.map((e) => [e.id, e.name])),
    [empresas],
  );

  // Si es gerente, `empresas` viene de /empresa/me y trae un solo elemento:
  // su propia empresa. Si es administrador, queda undefined y el modal
  // muestra el <select> completo con todas las empresas.
  const empresaIdBloqueada = esGerente ? empresas[0]?.id : undefined;

  const totalTambos = useMemo(
    () => proveedores.filter((p) => p.tipo === "tambo").length,
    [proveedores],
  );

  const totalActivos = useMemo(
    () => proveedores.filter((p) => p.estado === "activa").length,
    [proveedores],
  );

  const proveedoresFiltrados = useMemo(() => {
    return proveedores
      .filter((p) => {
        if (tabActivo === "Todos") return true;
        return p.tipo === TAB_TO_TIPO[tabActivo];
      })
      .filter((p) => {
        const q = busqueda.toLowerCase();
        if (!q) return true;
        const nombreEmpresa = empresaMap.get(p.empresaId) ?? "";
        return (
          p.razonSocial.toLowerCase().includes(q) ||
          p.cuit.includes(q) ||
          nombreEmpresa.toLowerCase().includes(q)
        );
      });
  }, [proveedores, tabActivo, busqueda, empresaMap]);

  return (
    <Layout breadcrumb="Consola > Proveedores">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Proveedores
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {proveedores.length} proveedores · {totalTambos} tambos ·{" "}
            {totalActivos} activos
          </p>
        </div>
        <Button
          type="button"
          className="!w-auto px-6"
          onClick={() => setIsModalOpen(true)}
        >
          + Nuevo proveedor
        </Button>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, CUIT o empresa..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setTabActivo(tab)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tabActivo === tab
                  ? "border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchProveedores()}
            className="ml-4 rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Contenido */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : proveedoresFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-base font-medium text-slate-700 dark:text-slate-300">
            No se encontraron proveedores
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Probá ajustar la búsqueda o el filtro de tipo.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                {HEADERS.map((h, i) => (
                  <th
                    key={`${h}-${i}`}
                    className="px-5 py-3 text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {proveedoresFiltrados.map((p) => {
                const nombreEmpresa =
                  empresaMap.get(p.empresaId) ?? `Empresa #${p.empresaId}`;
                return (
                  <tr key={p.id} className="text-sm">
                    {/* Proveedor */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {getInitials(p.razonSocial)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {p.razonSocial}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{p.cuit}</p>
                        </div>
                      </div>
                    </td>

                    {/* Tipo */}
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TIPO_CLASS[p.tipo]}`}
                      >
                        {TIPO_LABEL[p.tipo]}
                      </span>
                    </td>

                    {/* Empresa */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                          {getInitials(nombreEmpresa)}
                        </div>
                        <span className="text-slate-700 dark:text-slate-300">{nombreEmpresa}</span>
                      </div>
                    </td>

                    {/* Capacidad */}
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {capacidadLabel(p)}
                    </td>

                    {/* Ubicación */}
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {[p.localidad, p.provincia].filter(Boolean).join(", ") ||
                        "—"}
                    </td>

                    {/* Estado */}
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ESTADO_CLASS[p.estado]}`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${ESTADO_DOT[p.estado]}`}
                        />
                        {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                      </span>
                    </td>

                    {/* Editar */}
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setProveedorEnEdicion(p)}
                        aria-label={`Editar ${p.razonSocial}`}
                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ProveedorFormModal
        isOpen={isModalOpen}
        proveedor={null}
        empresas={empresas}
        empresaIdBloqueada={empresaIdBloqueada}
        isSubmitting={isCreating}
        onClose={() => setIsModalOpen(false)}
        onSubmit={createProveedor}
      />

      {proveedorEnEdicion && (
        <ProveedorFormModal
          isOpen={true}
          proveedor={proveedorEnEdicion}
          empresas={empresas}
          empresaIdBloqueada={empresaIdBloqueada}
          isSubmitting={isUpdating}
          onClose={() => setProveedorEnEdicion(null)}
          onSubmit={(dto) => updateProveedor(proveedorEnEdicion.id, dto)}
        />
      )}
    </Layout>
  );
}