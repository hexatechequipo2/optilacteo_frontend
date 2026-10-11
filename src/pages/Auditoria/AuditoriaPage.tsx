import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Layout } from "../../components/layout/Layout";
import { Select } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Badge, type BadgeVariant } from "../../components/ui/Badge";
import { useAuditLog } from "../../hooks/useAuditLog";
import { useUsuariosEmpresa } from "../../hooks/useUsuariosEmpresa";
import {
  TIPOS_ACCION,
  TIPO_ACCION_LABELS,
  type AuditLog,
  type EstadoAuditLog,
  type TipoAccion,
} from "../../types/auditLog.types";

// HU-43: "Log de auditoría" para Gerente, conectado a GET /audit-log
// (optilacteo-backend, PR #142). Filtros y paginación server-side; el CSV
// sale de GET /audit-log/export con los mismos filtros. Solo lectura: el
// log no se edita ni se borra (AC). No confundir con AuditoriaModal.tsx
// (HU-63), que es la trazabilidad de un registro puntual.

const TIPO_ACCION_VARIANT: Record<TipoAccion, BadgeVariant> = {
  ALTA: "success",
  EDICION: "info",
  BAJA: "danger",
  EXPORTACION: "neutral",
  LOGIN: "neutral",
  LOGOUT: "neutral",
  CONFIGURACION: "warning",
  OTRO: "neutral",
};

const TODOS_LOS_USUARIOS = "__todos__";
const TODAS_LAS_ACCIONES = "__todas__";
const TODOS_LOS_RESULTADOS = "__todos__";

const RESULTADO_OPTIONS = [
  { value: TODOS_LOS_RESULTADOS, label: "Todas" },
  { value: "SUCCESS", label: "Exitosas" },
  { value: "FAILURE", label: "Fallidas" },
];

// Los <input type="date"> dan yyyy-MM-dd en hora local. Mandarlo así al
// backend lo parsea como medianoche UTC (3h de corrimiento en AR), así que
// se manda el inicio/fin del día local convertido a ISO.
function inicioDelDiaIso(fecha: string): string {
  return new Date(`${fecha}T00:00:00`).toISOString();
}

function finDelDiaIso(fecha: string): string {
  return new Date(`${fecha}T23:59:59.999`).toISOString();
}

// El AuditInterceptor registra también los intentos fallidos con el mismo
// `tipo`; solo el sufijo de `accion` los distingue.
function esFallida(entrada: AuditLog): boolean {
  return entrada.accion.endsWith("_FAILURE");
}

export default function AuditoriaPage() {
  const [usuarioFiltro, setUsuarioFiltro] = useState(TODOS_LOS_USUARIOS);
  const [accionFiltro, setAccionFiltro] = useState(TODAS_LAS_ACCIONES);
  const [resultadoFiltro, setResultadoFiltro] = useState(TODOS_LOS_RESULTADOS);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const rangoInvalido = Boolean(desde && hasta && desde > hasta);

  const { usuarios } = useUsuariosEmpresa();
  const {
    items,
    meta,
    page,
    setPage,
    isLoading,
    error,
    refetch,
    isExporting,
    exportError,
    exportCsv,
  } = useAuditLog({
    userId: usuarioFiltro === TODOS_LOS_USUARIOS ? undefined : Number(usuarioFiltro),
    tipo: accionFiltro === TODAS_LAS_ACCIONES ? undefined : (accionFiltro as TipoAccion),
    estado:
      resultadoFiltro === TODOS_LOS_RESULTADOS ? undefined : (resultadoFiltro as EstadoAuditLog),
    fechaDesde: desde && !rangoInvalido ? inicioDelDiaIso(desde) : undefined,
    fechaHasta: hasta && !rangoInvalido ? finDelDiaIso(hasta) : undefined,
  });

  const usuarioOptions = useMemo(
    () => [
      { value: TODOS_LOS_USUARIOS, label: "Todos los usuarios" },
      ...[...usuarios]
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
        .map((u) => ({
          value: String(u.id),
          label: u.isActive ? u.name : `${u.name} (inactivo)`,
        })),
    ],
    [usuarios],
  );

  const accionOptions = [
    { value: TODAS_LAS_ACCIONES, label: "Todas las acciones" },
    ...TIPOS_ACCION.map((tipo) => ({ value: tipo, label: TIPO_ACCION_LABELS[tipo] })),
  ];

  return (
    <Layout breadcrumb="Consola > Auditoría">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Log de auditoría
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{meta.total} resultados</p>
        </div>
        <Button
          type="button"
          className="!w-auto gap-2 px-4"
          disabled={isExporting}
          onClick={() => void exportCsv()}
        >
          <Download className="h-4 w-4" /> {isExporting ? "Exportando..." : "Exportar CSV"}
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Select
          id="auditoria-usuario"
          label="Usuario"
          options={usuarioOptions}
          value={usuarioFiltro}
          onChange={(e) => setUsuarioFiltro(e.target.value)}
        />
        <Select
          id="auditoria-accion"
          label="Tipo de acción"
          options={accionOptions}
          value={accionFiltro}
          onChange={(e) => setAccionFiltro(e.target.value)}
        />
        <Select
          id="auditoria-resultado"
          label="Resultado"
          options={RESULTADO_OPTIONS}
          value={resultadoFiltro}
          onChange={(e) => setResultadoFiltro(e.target.value)}
        />
        <Input
          id="auditoria-desde"
          type="date"
          label="Desde"
          value={desde}
          max={hasta || undefined}
          onChange={(e) => setDesde(e.target.value)}
        />
        <Input
          id="auditoria-hasta"
          type="date"
          label="Hasta"
          value={hasta}
          min={desde || undefined}
          onChange={(e) => setHasta(e.target.value)}
        />
      </div>

      {rangoInvalido && (
        <div className="mb-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
          La fecha "Desde" no puede ser posterior a "Hasta". El filtro de período no se aplica.
        </div>
      )}

      {exportError && (
        <div className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
          {exportError}
        </div>
      )}

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

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Hora</th>
              <th className="px-4 py-3">Acción</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Entidad afectada</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  Cargando log de auditoría...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  No hay entradas que coincidan con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              items.map((entrada) => {
                const fecha = new Date(entrada.createdAt);
                return (
                  <tr
                    key={entrada.id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                  >
                    <td className="px-4 py-3">
                      <p
                        className="font-medium text-slate-900 dark:text-white"
                        title={entrada.userEmail}
                      >
                        {entrada.userNombre ?? entrada.userEmail}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {entrada.userRol ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {fecha.toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {fecha.toLocaleTimeString("es-AR", { hourCycle: "h23" })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={TIPO_ACCION_VARIANT[entrada.tipo] ?? "neutral"}>
                          {TIPO_ACCION_LABELS[entrada.tipo] ?? entrada.tipo}
                        </Badge>
                        {esFallida(entrada) && <Badge variant="danger">Fallida</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {entrada.descripcion ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {entrada.entidadId != null
                        ? `${entrada.entidad} #${entrada.entidadId}`
                        : entrada.entidad}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && items.length > 0 && (
        <div className="mt-4 flex items-center justify-end">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {page} de {meta.lastPage} · {meta.total} resultados
            </span>
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={page >= meta.lastPage}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
