import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../components/layout/Layout";
import { AvisoDatosIlustrativos } from "../../components/ui/AvisoDatosIlustrativos";
import { Select } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { ClasificacionLoteBadge } from "../../components/ClasificacionLoteBadge";
import { LOTES_DATOS_ILUSTRATIVOS } from "../../constants/lotes";
import { ClasificacionLote } from "../../types/lote.types";
import { construirLotesConsultaMock, type LoteConsulta } from "./constants/consultaLotes";

// HU-77 (mock visual): pantalla dedicada a la consulta de lotes sin generar
// previamente un reporte de trazabilidad (a diferencia de LotesPage.tsx, que
// es la grilla operativa real con alta/edición/mediciones). Ver el
// comentario de constants/consultaLotes.ts sobre el estado del mock.

const TODOS = "__todos__";
type OrdenCampo = "fecha" | "codigo";

const ESTADO_OPTIONS = [
  { value: TODOS, label: "Todos" },
  { value: ClasificacionLote.APTO, label: "Apto" },
  { value: ClasificacionLote.NO_APTO, label: "No Apto" },
];

function toInputDate(iso: string): string {
  return iso.slice(0, 10);
}

export default function ConsultaLotesPage() {
  const navigate = useNavigate();
  const [lotes] = useState<LoteConsulta[]>(() => construirLotesConsultaMock());

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [proveedorFiltro, setProveedorFiltro] = useState(TODOS);
  const [tamboFiltro, setTamboFiltro] = useState(TODOS);
  const [estadoFiltro, setEstadoFiltro] = useState(TODOS);
  const [orden, setOrden] = useState<{ campo: OrdenCampo; asc: boolean }>({
    campo: "fecha",
    asc: false,
  });

  const proveedorOptions = useMemo(() => {
    const unicos = [...new Set(lotes.map((l) => l.proveedor))].sort((a, b) => a.localeCompare(b, "es"));
    return [{ value: TODOS, label: "Todos los proveedores" }, ...unicos.map((p) => ({ value: p, label: p }))];
  }, [lotes]);

  const tamboOptions = useMemo(() => {
    const unicos = [...new Set(lotes.map((l) => l.tambo))].sort((a, b) => a.localeCompare(b, "es"));
    return [{ value: TODOS, label: "Todos los tambos" }, ...unicos.map((t) => ({ value: t, label: t }))];
  }, [lotes]);

  const rangoInvalido = Boolean(desde && hasta && desde > hasta);

  const lotesFiltrados = useMemo(() => {
    let resultado = lotes;
    if (desde && !rangoInvalido) {
      resultado = resultado.filter((l) => toInputDate(l.fechaIngreso) >= desde);
    }
    if (hasta && !rangoInvalido) {
      resultado = resultado.filter((l) => toInputDate(l.fechaIngreso) <= hasta);
    }
    if (proveedorFiltro !== TODOS) {
      resultado = resultado.filter((l) => l.proveedor === proveedorFiltro);
    }
    if (tamboFiltro !== TODOS) {
      resultado = resultado.filter((l) => l.tambo === tamboFiltro);
    }
    if (estadoFiltro !== TODOS) {
      resultado = resultado.filter((l) => l.estado === estadoFiltro);
    }

    const factor = orden.asc ? 1 : -1;
    return [...resultado].sort((a, b) => {
      if (orden.campo === "codigo") return factor * a.codigo.localeCompare(b.codigo);
      return factor * (new Date(a.fechaIngreso).getTime() - new Date(b.fechaIngreso).getTime());
    });
  }, [lotes, desde, hasta, rangoInvalido, proveedorFiltro, tamboFiltro, estadoFiltro, orden]);

  const limpiarFiltros = () => {
    setDesde("");
    setHasta("");
    setProveedorFiltro(TODOS);
    setTamboFiltro(TODOS);
    setEstadoFiltro(TODOS);
  };

  const hayFiltrosActivos =
    desde !== "" || hasta !== "" || proveedorFiltro !== TODOS || tamboFiltro !== TODOS || estadoFiltro !== TODOS;

  const toggleOrden = (campo: OrdenCampo) => {
    setOrden((prev) => (prev.campo === campo ? { campo, asc: !prev.asc } : { campo, asc: campo === "codigo" }));
  };

  return (
    <Layout breadcrumb="Consola > Lotes">
      {LOTES_DATOS_ILUSTRATIVOS && <AvisoDatosIlustrativos className="mb-6" />}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Lotes de producción
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Consulta directa de lotes, sin generar reporte previo · {lotesFiltrados.length} resultados
          </p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          id="consulta-lotes-desde"
          type="date"
          label="Desde"
          value={desde}
          max={hasta || undefined}
          onChange={(e) => setDesde(e.target.value)}
        />
        <Input
          id="consulta-lotes-hasta"
          type="date"
          label="Hasta"
          value={hasta}
          min={desde || undefined}
          onChange={(e) => setHasta(e.target.value)}
        />
        <Select
          id="consulta-lotes-proveedor"
          label="Proveedor"
          options={proveedorOptions}
          value={proveedorFiltro}
          onChange={(e) => setProveedorFiltro(e.target.value)}
        />
        <Select
          id="consulta-lotes-tambo"
          label="Tambo"
          options={tamboOptions}
          value={tamboFiltro}
          onChange={(e) => setTamboFiltro(e.target.value)}
        />
        <Select
          id="consulta-lotes-estado"
          label="Estado"
          options={ESTADO_OPTIONS}
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
        />
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        {rangoInvalido ? (
          <div className="rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
            La fecha "Desde" no puede ser posterior a "Hasta". El filtro de período no se aplica.
          </div>
        ) : (
          <span />
        )}
        {hayFiltrosActivos && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {lotesFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-base font-medium text-slate-700 dark:text-slate-300">
            No se encontraron lotes
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Ningún lote coincide con los filtros seleccionados.
          </p>
          <button
            type="button"
            onClick={limpiarFiltros}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <>
          {/* Tabla (md+) */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:text-slate-500">
                  <th className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => toggleOrden("codigo")}
                      className="hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      Lote {orden.campo === "codigo" ? (orden.asc ? "↑" : "↓") : ""}
                    </button>
                  </th>
                  <th className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => toggleOrden("fecha")}
                      className="hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      Fecha {orden.campo === "fecha" ? (orden.asc ? "↑" : "↓") : ""}
                    </button>
                  </th>
                  <th className="px-5 py-3">Proveedor</th>
                  <th className="px-5 py-3">Tambo</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {lotesFiltrados.map((lote) => (
                  <tr key={lote.codigo} className="text-sm">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-slate-900 dark:text-white">
                      {lote.codigo}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {new Date(lote.fechaIngreso).toLocaleString("es-AR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{lote.proveedor}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">{lote.tambo}</td>
                    <td className="px-5 py-3">
                      <ClasificacionLoteBadge resultado={lote.estado} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/lotes/consulta/${lote.codigo}`)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Ver trazabilidad <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards (mobile) */}
          <div className="flex flex-col gap-3 md:hidden">
            {lotesFiltrados.map((lote) => (
              <button
                key={lote.codigo}
                type="button"
                onClick={() => navigate(`/lotes/consulta/${lote.codigo}`)}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-left dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-mono text-xs font-medium text-slate-900 dark:text-white">
                    {lote.codigo}
                  </span>
                  <ClasificacionLoteBadge resultado={lote.estado} />
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{lote.proveedor}</p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500">Tambo</dt>
                    <dd className="text-slate-600 dark:text-slate-400">{lote.tambo}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500">Fecha</dt>
                    <dd className="text-slate-600 dark:text-slate-400">
                      {new Date(lote.fechaIngreso).toLocaleDateString("es-AR")}
                    </dd>
                  </div>
                </dl>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                  Ver trazabilidad <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
        Fechas y horas en hora de Argentina (UTC−3). Se muestran solo los lotes de la empresa del usuario
        autenticado.
      </p>
    </Layout>
  );
}
