import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../../components/layout/Layout";
import { Badge, type BadgeVariant } from "../../components/ui/Badge";
import { Select } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { useConsultaLotesProduccion } from "../../hooks/useConsultaLotesProduccion";
import { useOpcionesFiltroLotes } from "../../hooks/useOpcionesFiltroLotes";
import {
  EstadoProduccion,
  type ConsultaLotesProduccionQuery,
  type LoteProduccionResumen,
  type ReferenciaNombre,
} from "../../types/consultaLotesProduccion.types";
import { esFechaCalendario, esRangoInvertido } from "../../utils/fechaCalendario";

// HU-77: consulta de lotes de PRODUCCIÓN (HU-68) sin generar reporte previo,
// contra GET /lotes/producciones/consulta. A diferencia de LotesPage.tsx
// (grilla operativa de lotes de ingreso), un lote de producción puede tener
// varios proveedores y tambos de origen, y su estado es derivado de los
// lotes de ingreso consumidos. El back ya filtra por la empresa del token.

const TODOS = "__todos__";
const PAGE_SIZE = 20;
type OrdenCampo = "fecha" | "codigo";

const ESTADO_LABEL: Record<EstadoProduccion, string> = {
  [EstadoProduccion.SIN_CONSUMOS]: "Sin consumos",
  [EstadoProduccion.EN_PROCESO]: "En proceso",
  [EstadoProduccion.FINALIZADO]: "Finalizado",
};

const ESTADO_VARIANT: Record<EstadoProduccion, BadgeVariant> = {
  [EstadoProduccion.SIN_CONSUMOS]: "neutral",
  [EstadoProduccion.EN_PROCESO]: "info",
  [EstadoProduccion.FINALIZADO]: "success",
};

const ESTADO_OPTIONS = [
  { value: TODOS, label: "Todos" },
  ...Object.values(EstadoProduccion).map((e) => ({ value: e, label: ESTADO_LABEL[e] })),
];

// Siempre en hora AR, sin depender del huso del navegador (CA8).
const FORMATO_FECHA_HORA = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const FORMATO_FECHA = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function EstadoBadge({ lote }: { lote: LoteProduccionResumen }) {
  return (
    <span title={lote.estadoDescripcion}>
      <Badge variant={ESTADO_VARIANT[lote.estado]}>{ESTADO_LABEL[lote.estado]}</Badge>
    </span>
  );
}

// Proveedores/tambos son listas: el primero + "+N"; la lista completa en el
// title y en el detalle del lote.
function ListaCompacta({ items }: { items: ReferenciaNombre[] }) {
  if (items.length === 0) return <span className="text-slate-400">—</span>;
  const [primero, ...resto] = items;
  return (
    <span title={items.map((i) => i.nombre).join(", ")}>
      {primero.nombre}
      {resto.length > 0 && (
        <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">+{resto.length}</span>
      )}
    </span>
  );
}

function aIdOpcional(valor: string): number | undefined {
  return valor === TODOS ? undefined : Number(valor);
}

export default function ConsultaLotesPage() {
  const navigate = useNavigate();
  const { proveedores, tambos, errorProveedores, errorTambos } = useOpcionesFiltroLotes();

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [proveedorFiltro, setProveedorFiltro] = useState(TODOS);
  const [tamboFiltro, setTamboFiltro] = useState(TODOS);
  const [estadoFiltro, setEstadoFiltro] = useState(TODOS);
  const [orden, setOrden] = useState<{ campo: OrdenCampo; asc: boolean }>({
    campo: "fecha",
    asc: false,
  });

  // Un "Desde" posterior a "Hasta" no se manda (el back respondería 400):
  // se avisa y el período no se aplica, igual que antes.
  const rangoInvalido = esRangoInvertido(desde, hasta);

  const query: ConsultaLotesProduccionQuery = {
    fechaDesde: !rangoInvalido && esFechaCalendario(desde) ? desde : undefined,
    fechaHasta: !rangoInvalido && esFechaCalendario(hasta) ? hasta : undefined,
    proveedorId: aIdOpcional(proveedorFiltro),
    tamboId: aIdOpcional(tamboFiltro),
    estado: estadoFiltro === TODOS ? undefined : (estadoFiltro as EstadoProduccion),
    sortBy: orden.campo,
    sortOrder: orden.asc ? "ASC" : "DESC",
    page: 1,
    limit: PAGE_SIZE,
  };

  const { resultado, isLoading, error, refetch } = useConsultaLotesProduccion(query);
  const lotes = resultado?.data ?? [];
  const total = resultado?.total ?? 0;

  const proveedorOptions = useMemo(
    () => [
      { value: TODOS, label: "Todos los proveedores" },
      ...[...proveedores]
        .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial, "es"))
        .map((p) => ({ value: String(p.id), label: p.razonSocial })),
    ],
    [proveedores],
  );

  // GET /tambos ya viene ordenado por nombre.
  const tamboOptions = useMemo(
    () => [
      { value: TODOS, label: "Todos los tambos" },
      ...tambos.map((t) => ({ value: String(t.id), label: t.nombre })),
    ],
    [tambos],
  );

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

  const irAlDetalle = (lote: LoteProduccionResumen) => navigate(`/lotes/consulta/${lote.id}`);

  return (
    <Layout breadcrumb="Consola > Consulta de lotes">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Lotes de producción
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Consulta directa de lotes, sin generar reporte previo
            {resultado && ` · ${total} resultados`}
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
          disabled={errorProveedores}
          error={errorProveedores ? "No se pudieron cargar los proveedores." : undefined}
          onChange={(e) => setProveedorFiltro(e.target.value)}
        />
        <Select
          id="consulta-lotes-tambo"
          label="Tambo"
          options={tamboOptions}
          value={tamboFiltro}
          disabled={errorTambos}
          error={errorTambos ? "No se pudieron cargar los tambos." : undefined}
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

      {error ? (
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 py-12 text-center dark:border-red-500/30 dark:bg-red-500/10"
        >
          <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/20"
          >
            Reintentar
          </button>
        </div>
      ) : !resultado ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Cargando lotes…
        </div>
      ) : lotes.length === 0 ? (
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
        <div className={isLoading ? "opacity-60 transition-opacity" : undefined} aria-busy={isLoading}>
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
                {lotes.map((lote) => (
                  <tr key={lote.id} className="text-sm">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-slate-900 dark:text-white">
                      {lote.codigo}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {FORMATO_FECHA_HORA.format(new Date(lote.fecha))}
                    </td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                      <ListaCompacta items={lote.proveedores} />
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      <ListaCompacta items={lote.tambos} />
                    </td>
                    <td className="px-5 py-3">
                      <EstadoBadge lote={lote} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => irAlDetalle(lote)}
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
            {lotes.map((lote) => (
              <button
                key={lote.id}
                type="button"
                onClick={() => irAlDetalle(lote)}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 text-left dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-mono text-xs font-medium text-slate-900 dark:text-white">
                    {lote.codigo}
                  </span>
                  <EstadoBadge lote={lote} />
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  <ListaCompacta items={lote.proveedores} />
                </p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500">Tambo</dt>
                    <dd className="text-slate-600 dark:text-slate-400">
                      <ListaCompacta items={lote.tambos} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500">Fecha</dt>
                    <dd className="text-slate-600 dark:text-slate-400">
                      {FORMATO_FECHA.format(new Date(lote.fecha))}
                    </dd>
                  </div>
                </dl>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400">
                  Ver trazabilidad <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
          </div>

          {/* TODO(paso 2): paginación. Por ahora se avisa si quedan lotes fuera. */}
          {total > lotes.length && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Mostrando {lotes.length} de {total} lotes.
            </p>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
        Fechas y horas en hora de Argentina (UTC−3). Se muestran solo los lotes de la empresa del usuario
        autenticado.
      </p>
    </Layout>
  );
}
