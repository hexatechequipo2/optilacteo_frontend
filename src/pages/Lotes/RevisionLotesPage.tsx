import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { Layout } from "../../components/layout/Layout";
import { Badge } from "../../components/ui/Badge";
import { Tabs } from "../../components/ui/Tabs";
import { useAuth } from "../../hooks/useAuth";
import { useHistorialDecisionesLotes } from "../../hooks/useHistorialDecisionesLotes";
import { useLotesNoAptos } from "../../hooks/useLotesNoAptos";
import { proveedoresService } from "../../services/proveedores.service";
import { TIPO_MATERIA_PRIMA_TABS } from "../Configuracion/constants/parametrosCalidad";
import { DecisionRevision, type Lote } from "../../types/lote.types";
import type { Proveedor } from "../../types/proveedor.types";
import { resolverUsuarioRevision } from "../../utils/resolverUsuarioRevision";
import { RevisionLoteModal } from "./components/RevisionLoteModal";

const PROVEEDORES_SELECT_LIMIT = 100;

const HEADERS_PENDIENTES = ["LOTE", "PROVEEDOR", "MATERIA PRIMA", "INGRESO", ""];
const HEADERS_HISTORIAL = ["LOTE", "DECISIÓN", "JUSTIFICACIÓN", "USUARIO", "FECHA Y HORA"];

const TIPO_MATERIA_PRIMA_LABEL = new Map(TIPO_MATERIA_PRIMA_TABS.map((t) => [t.value, t.label]));

const DECISION_LABEL: Record<DecisionRevision, string> = {
  [DecisionRevision.APROBADO]: "Aprobado",
  [DecisionRevision.RECHAZADO]: "Rechazado",
};

const DECISION_VARIANT: Record<DecisionRevision, "success" | "danger"> = {
  [DecisionRevision.APROBADO]: "success",
  [DecisionRevision.RECHAZADO]: "danger",
};

type TabRevision = "pendientes" | "historial";

const TAB_PENDIENTES: { value: TabRevision; label: string } = {
  value: "pendientes",
  label: "Pendientes de revisión",
};

const TAB_HISTORIAL: { value: TabRevision; label: string } = {
  value: "historial",
  label: "Historial de decisiones",
};

// HU-22: bandeja dedicada de lotes No Apto (GET /lotes/no-aptos), separada
// de LotesPage porque el backend ya expone ese filtro como endpoint propio
// y porque solo Responsable de Calidad accede acá — mismo patrón de tabla
// que LotesPage.tsx, sin reusar el componente porque las columnas y la
// acción son distintas.
export default function RevisionLotesPage() {
  const { lotes, isLoading, error, refetch } = useLotesNoAptos();
  const {
    items: decisiones,
    isLoading: isLoadingDecisiones,
    error: errorDecisiones,
    refetch: refetchDecisiones,
  } = useHistorialDecisionesLotes();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loteEnRevision, setLoteEnRevision] = useState<Lote | null>(null);
  const [tabActiva, setTabActiva] = useState<TabRevision>(TAB_PENDIENTES.value);
  const { user } = useAuth();

  useEffect(() => {
    proveedoresService
      .getAll({ page: 1, limit: PROVEEDORES_SELECT_LIMIT, estado: "activa" })
      .then((result) => setProveedores(result.data))
      .catch(() => setProveedores([]));
  }, []);

  const proveedorMap = new Map(proveedores.map((p) => [p.id, p.razonSocial]));

  const revisado = () => {
    void refetch();
    void refetchDecisiones();
  };

  return (
    <Layout breadcrumb="Consola > Lotes > Revisión de calidad">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Revisión de calidad
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {lotes.length} lotes No Apto pendientes de revisión manual
        </p>
      </div>

      <div className="mb-4">
        <Tabs tabs={[TAB_PENDIENTES, TAB_HISTORIAL]} value={tabActiva} onChange={setTabActiva} />
      </div>

      {tabActiva === "pendientes" ? (
        <>
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

          {isLoading ? (
            <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">Cargando lotes...</p>
            </div>
          ) : lotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
              <p className="text-base font-medium text-slate-700 dark:text-slate-300">
                No hay lotes pendientes de revisión
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Todos los lotes clasificados como No Apto ya fueron revisados.
              </p>
            </div>
          ) : (
            <>
              {/* Tabla (md+) */}
              <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      {HEADERS_PENDIENTES.map((h) => (
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
                    {lotes.map((lote) => (
                      <tr key={lote.id} className="text-sm">
                        <td className="px-5 py-3 font-mono text-xs font-medium text-slate-900 dark:text-white">
                          {lote.codigo}
                        </td>
                        <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                          {proveedorMap.get(lote.proveedorId) ?? `Proveedor #${lote.proveedorId}`}
                        </td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                          {TIPO_MATERIA_PRIMA_LABEL.get(lote.materiaPrima) ?? lote.materiaPrima}
                        </td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                          {new Date(lote.fechaIngreso).toLocaleDateString("es-AR")}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setLoteEnRevision(lote)}
                              className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                              title="Aprobar o rechazar lote"
                            >
                              <ClipboardCheck className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards (mobile) */}
              <div className="flex flex-col gap-3 md:hidden">
                {lotes.map((lote) => (
                  <div
                    key={lote.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs font-medium text-slate-900 dark:text-white">
                          {lote.codigo}
                        </p>
                        <p className="truncate text-sm text-slate-700 dark:text-slate-300">
                          {proveedorMap.get(lote.proveedorId) ?? `Proveedor #${lote.proveedorId}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLoteEnRevision(lote)}
                        className="flex-shrink-0 rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                        title="Aprobar o rechazar lote"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                      </button>
                    </div>

                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      <div>
                        <dt className="text-slate-400 dark:text-slate-500">Materia prima</dt>
                        <dd className="text-slate-600 dark:text-slate-400">
                          {TIPO_MATERIA_PRIMA_LABEL.get(lote.materiaPrima) ?? lote.materiaPrima}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-400 dark:text-slate-500">Ingreso</dt>
                        <dd className="text-slate-600 dark:text-slate-400">
                          {new Date(lote.fechaIngreso).toLocaleDateString("es-AR")}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {errorDecisiones && (
            <div className="mb-4 flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
              <span>{errorDecisiones}</span>
              <button
                type="button"
                onClick={() => void refetchDecisiones()}
                className="ml-4 rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30"
              >
                Reintentar
              </button>
            </div>
          )}

          {isLoadingDecisiones ? (
            <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">Cargando historial...</p>
            </div>
          ) : decisiones.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
              <p className="text-base font-medium text-slate-700 dark:text-slate-300">
                Todavía no hay decisiones registradas
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Cuando apruebes o rechacés un lote, va a quedar registrado acá.
              </p>
            </div>
          ) : (
            <>
              {/* Tabla (md+) */}
              <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      {HEADERS_HISTORIAL.map((h) => (
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
                    {decisiones.map(({ revision, lote }) => (
                      <tr key={revision.id} className="text-sm">
                        <td className="px-5 py-3 font-mono text-xs font-medium text-slate-900 dark:text-white">
                          {lote.codigo}
                        </td>
                        <td className="px-5 py-3">
                          <Badge variant={DECISION_VARIANT[revision.decision]}>
                            {DECISION_LABEL[revision.decision] ?? revision.decision}
                          </Badge>
                        </td>
                        <td className="max-w-xs px-5 py-3 text-slate-600 dark:text-slate-400">
                          {revision.justificacion}
                        </td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                          {resolverUsuarioRevision(revision.usuarioId, user)}
                        </td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                          {new Date(revision.createdAt).toLocaleString("es-AR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards (mobile) */}
              <div className="flex flex-col gap-3 md:hidden">
                {decisiones.map(({ revision, lote }) => (
                  <div
                    key={revision.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="truncate font-mono text-xs font-medium text-slate-900 dark:text-white">
                        {lote.codigo}
                      </p>
                      <Badge variant={DECISION_VARIANT[revision.decision]}>
                        {DECISION_LABEL[revision.decision] ?? revision.decision}
                      </Badge>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {revision.justificacion}
                    </p>

                    <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>{resolverUsuarioRevision(revision.usuarioId, user)}</span>
                      <span>{new Date(revision.createdAt).toLocaleString("es-AR")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <RevisionLoteModal
        isOpen={loteEnRevision !== null}
        lote={loteEnRevision}
        onClose={() => setLoteEnRevision(null)}
        onRevisado={revisado}
      />
    </Layout>
  );
}
