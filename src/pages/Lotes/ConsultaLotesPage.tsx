import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
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
  type ProduccionSortField,
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

// Columnas que el back sabe ordenar (lista blanca de SORT_SQL en
// lote-produccion-consulta.service.ts). Proveedor y Tambo son listas: no se
// ordenan. Al cambiar de columna arranca en la dirección más útil.
const DIRECCION_INICIAL: Record<ProduccionSortField, boolean> = {
  codigo: true, // asc
  fecha: false, // más recientes primero
  estado: true,
  lotesOrigen: false, // los que más orígenes tienen primero
};

// Mismo orden de columnas que la grilla; lo usa el select de mobile.
const ORDEN_OPTIONS: { value: ProduccionSortField; label: string }[] = [
  { value: "codigo", label: "Lote" },
  { value: "fecha", label: "Fecha" },
  { value: "lotesOrigen", label: "Lotes de origen" },
  { value: "estado", label: "Estado" },
];

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

interface Orden {
  campo: ProduccionSortField;
  asc: boolean;
}

// aria-sort solo en la columna ordenada; la flecha es decorativa.
function EncabezadoOrdenable({
  campo,
  label,
  orden,
  onOrdenar,
  className = "",
}: {
  campo: ProduccionSortField;
  label: string;
  orden: Orden;
  onOrdenar: (campo: ProduccionSortField) => void;
  className?: string;
}) {
  const activo = orden.campo === campo;
  return (
    <th
      scope="col"
      className={`px-5 py-3 ${className}`}
      aria-sort={activo ? (orden.asc ? "ascending" : "descending") : undefined}
    >
      <button
        type="button"
        onClick={() => onOrdenar(campo)}
        className="inline-flex items-center gap-1 uppercase hover:text-slate-600 dark:hover:text-slate-300"
      >
        {label}
        <span aria-hidden="true" className={activo ? "" : "opacity-0"}>
          {activo && !orden.asc ? "↓" : "↑"}
        </span>
      </button>
    </th>
  );
}

export default function ConsultaLotesPage() {
  const navigate = useNavigate();
  const { proveedores, tambos, errorProveedores, errorTambos } = useOpcionesFiltroLotes();

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [proveedorFiltro, setProveedorFiltro] = useState(TODOS);
  const [tamboFiltro, setTamboFiltro] = useState(TODOS);
  const [estadoFiltro, setEstadoFiltro] = useState(TODOS);
  const [orden, setOrden] = useState<Orden>({ campo: "fecha", asc: false });
  const [page, setPage] = useState(1);

  // Cambiar un filtro o el orden vuelve a la página 1. Se hace en el mismo
  // handler (no con un efecto) para que salga un solo pedido, no dos.
  const conPaginaUno =
    <T,>(setter: (valor: T) => void) =>
    (valor: T) => {
      setter(valor);
      setPage(1);
    };

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
    page,
    limit: PAGE_SIZE,
  };

  const { resultado, isLoading, error, refetch } = useConsultaLotesProduccion(query);
  const lotes = resultado?.data ?? [];
  const total = resultado?.total ?? 0;
  // Se usa lo que devolvió el back (no la constante) para no desfasar el
  // indicador si el back ajusta el limit.
  const totalPaginas = resultado ? Math.max(1, Math.ceil(total / resultado.limit)) : 1;

  // Si la página pedida quedó fuera de rango (se borraron lotes entre una
  // consulta y otra), se salta a la última que tiene datos.
  useEffect(() => {
    if (resultado && resultado.data.length === 0 && resultado.total > 0 && page > totalPaginas) {
      setPage(totalPaginas);
    }
  }, [resultado, page, totalPaginas]);

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
    setPage(1);
  };

  const hayFiltrosActivos =
    desde !== "" || hasta !== "" || proveedorFiltro !== TODOS || tamboFiltro !== TODOS || estadoFiltro !== TODOS;

  const ordenarPor = (campo: ProduccionSortField) => {
    setOrden((prev) => (prev.campo === campo ? { campo, asc: !prev.asc } : { campo, asc: DIRECCION_INICIAL[campo] }));
    setPage(1);
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
          onChange={(e) => conPaginaUno(setDesde)(e.target.value)}
        />
        <Input
          id="consulta-lotes-hasta"
          type="date"
          label="Hasta"
          value={hasta}
          min={desde || undefined}
          onChange={(e) => conPaginaUno(setHasta)(e.target.value)}
        />
        <Select
          id="consulta-lotes-proveedor"
          label="Proveedor"
          options={proveedorOptions}
          value={proveedorFiltro}
          disabled={errorProveedores}
          error={errorProveedores ? "No se pudieron cargar los proveedores." : undefined}
          onChange={(e) => conPaginaUno(setProveedorFiltro)(e.target.value)}
        />
        <Select
          id="consulta-lotes-tambo"
          label="Tambo"
          options={tamboOptions}
          value={tamboFiltro}
          disabled={errorTambos}
          error={errorTambos ? "No se pudieron cargar los tambos." : undefined}
          onChange={(e) => conPaginaUno(setTamboFiltro)(e.target.value)}
        />
        <Select
          id="consulta-lotes-estado"
          label="Estado"
          options={ESTADO_OPTIONS}
          value={estadoFiltro}
          onChange={(e) => conPaginaUno(setEstadoFiltro)(e.target.value)}
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
          {/* El back distingue "sin filtros" de "filtros sin resultados" en
              `mensaje`; el texto local queda de respaldo si no viene. */}
          <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
            {resultado.mensaje ??
              (hayFiltrosActivos
                ? "Ningún lote coincide con los filtros seleccionados."
                : "Todavía no hay lotes de producción registrados.")}
          </p>
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
      ) : (
        <div className={isLoading ? "opacity-60 transition-opacity" : undefined} aria-busy={isLoading}>
          {/* Tabla (md+) */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:text-slate-500">
                  <EncabezadoOrdenable campo="codigo" label="Lote" orden={orden} onOrdenar={ordenarPor} />
                  <EncabezadoOrdenable campo="fecha" label="Fecha" orden={orden} onOrdenar={ordenarPor} />
                  <th scope="col" className="px-5 py-3">Proveedor</th>
                  <th scope="col" className="px-5 py-3">Tambo</th>
                  <EncabezadoOrdenable
                    campo="lotesOrigen"
                    label="Lotes de origen"
                    orden={orden}
                    onOrdenar={ordenarPor}
                    className="text-right"
                  />
                  <EncabezadoOrdenable campo="estado" label="Estado" orden={orden} onOrdenar={ordenarPor} />
                  <th scope="col" className="px-5 py-3 text-right">Acciones</th>
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
                    <td className="px-5 py-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                      {lote.cantidadLotesOrigen}
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

          {/* Orden (mobile): los encabezados de la tabla no se ven. Usa el
              mismo ordenarPor: elegir otra columna aplica su dirección
              inicial y el botón invierte la actual; ambos vuelven a la página 1. */}
          <div className="mb-3 flex items-end gap-2 md:hidden">
            <div className="flex-1">
              <Select
                id="consulta-lotes-orden"
                label="Ordenar por"
                options={ORDEN_OPTIONS}
                value={orden.campo}
                onChange={(e) => ordenarPor(e.target.value as ProduccionSortField)}
              />
            </div>
            <button
              type="button"
              onClick={() => ordenarPor(orden.campo)}
              aria-label={`Invertir orden (ahora ${orden.asc ? "ascendente" : "descendente"})`}
              className="rounded-md border border-slate-300 px-3 py-2 text-base text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <span aria-hidden="true">{orden.asc ? "↑ Asc" : "↓ Desc"}</span>
            </button>
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

          {totalPaginas > 1 && (
            <nav
              aria-label="Paginación de lotes"
              className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800"
            >
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {(resultado.page - 1) * resultado.limit + 1}–
                {(resultado.page - 1) * resultado.limit + lotes.length} de {total} lotes
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Página anterior"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
                  Página {page} de {totalPaginas}
                </span>
                <button
                  type="button"
                  aria-label="Página siguiente"
                  onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
                  disabled={page >= totalPaginas || isLoading}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </nav>
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
