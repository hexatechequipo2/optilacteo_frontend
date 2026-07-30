import { useEffect, useMemo, useState } from "react";
import { FlaskConical, Pencil } from "lucide-react";
import { Layout } from "../../components/layout/Layout";
import { Button } from "../../components/ui/Button";
import { ClasificacionLoteBadge } from "../../components/ClasificacionLoteBadge";
import { useLotes } from "../../hooks/useLotes";
import { useSensores } from "../../hooks/useSensores";
import { useAuth } from "../../hooks/useAuth";
import { proveedoresService } from "../../services/proveedores.service";
import { TIPO_MATERIA_PRIMA_TABS } from "../Configuracion/constants/parametrosCalidad";
import { DestinoLote, type Lote } from "../../types/lote.types";
import type { Proveedor } from "../../types/proveedor.types";
import { LoteFormModal } from "./LoteFormModal";
import { LoteMedicionesModal } from "./components/LoteMedicionesModal";

// Universo suficiente para poblar el selector de proveedores del formulario
// (no es una tabla paginada: acá se necesita el catálogo completo).
const PROVEEDORES_SELECT_LIMIT = 100;

const DESTINO_LABEL: Record<DestinoLote, string> = {
  [DestinoLote.PRODUCCION]: "Producción",
  [DestinoLote.ALMACENAMIENTO]: "Almacenamiento",
  [DestinoLote.TRATAMIENTO]: "Tratamiento",
  [DestinoLote.DESCARTE]: "Descarte",
};

const HEADERS_BASE = ["LOTE", "PROVEEDOR", "MATERIA PRIMA", "INGRESO", "DESTINO"];

const TIPO_MATERIA_PRIMA_LABEL = new Map(TIPO_MATERIA_PRIMA_TABS.map((t) => [t.value, t.label]));

export default function LotesPage() {
  const { lotes, isLoading, error, refetch, createLote, isCreating, updateLote, isUpdating } =
    useLotes();
  const { user } = useAuth();
  const { sensores } = useSensores();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLote, setEditingLote] = useState<Lote | null>(null);
  const [loteMediciones, setLoteMediciones] = useState<Lote | null>(null);

  // Solo Responsable de calidad puede registrar/editar lotes (POST y PATCH
  // /lotes en el backend); Gerente/Administrador acceden a esta pantalla en
  // modo lectura.
  const puedeCrearLote = user?.rolNombre === "Responsable de calidad";

  // HU-21: la clasificación automática es del mismo rol dueño de la pantalla
  // de lotes (Responsable de calidad) — nombre propio para dejar claro por
  // qué se usa en cada lugar, aunque hoy sea el mismo booleano.
  const puedeVerClasificacion = puedeCrearLote;

  // HU-24: comparación histórica — @Roles del backend (lote.controller.ts)
  // permite Responsable de calidad, Gerente y Administrador (más amplio que
  // HU-21). Comparación normalizada, mismo criterio que puedeVerHistorialManual.
  const puedeVerComparacionHistorica = useMemo(() => {
    const rol = (user?.rolNombre ?? "").trim().toLowerCase();
    return rol === "responsable de calidad" || rol === "gerente" || rol === "administrador";
  }, [user?.rolNombre]);

  // POST /lotes/:id/mediciones-manuales (HU-20, backend): solo Operario de
  // línea. Es respaldo TOTAL: el back rechaza con 400 si el lote ya tiene
  // algún sensor asociado (corresponde HU-15 en ese caso), así que la acción
  // ni se ofrece cuando detectamos esa asociación del lado del cliente
  // (Sensor.loteActualId, ya viene en GET /sensores).
  const puedeCargarMedicionManualBase = user?.rolNombre === "Operario de línea";
  const lotesConSensorAsociado = useMemo(
    () => new Set(sensores.filter((s) => s.loteActualId != null).map((s) => s.loteActualId)),
    [sensores],
  );

  // GET /lotes/:id/mediciones-manuales (HU-20, backend): Operario de línea,
  // Responsable de producción, Gerente y Administrador. Responsable de
  // calidad no está habilitado ahí. Comparación normalizada (trim +
  // lowercase), mismo criterio que puedeVerHistorial en SensoresPage.
  const puedeVerHistorialManual = useMemo(() => {
    const rol = (user?.rolNombre ?? "").trim().toLowerCase();
    return (
      rol === "operario de línea" ||
      rol === "responsable de producción" ||
      rol === "gerente" ||
      rol === "administrador"
    );
  }, [user?.rolNombre]);

  // El ícono de la acción se ofrece si hay al menos una de las tres
  // capacidades (escribir, ver historial o ver clasificación automática);
  // qué pestañas quedan habilitadas adentro del modal se resuelve por lote
  // en el render de la fila.
  const puedeAbrirMediciones =
    puedeCargarMedicionManualBase ||
    puedeVerHistorialManual ||
    puedeVerClasificacion ||
    puedeVerComparacionHistorica;

  const abrirAlta = () => {
    setEditingLote(null);
    setIsModalOpen(true);
  };

  const abrirEdicion = (lote: Lote) => {
    setEditingLote(lote);
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setIsModalOpen(false);
    setEditingLote(null);
  };

  useEffect(() => {
    proveedoresService
      .getAll({ page: 1, limit: PROVEEDORES_SELECT_LIMIT, estado: "activa" })
      .then((result) => setProveedores(result.data))
      .catch(() => setProveedores([]));
  }, []);

  const proveedorMap = new Map(proveedores.map((p) => [p.id, p.razonSocial]));

  const headers = useMemo(() => {
    const list = [...HEADERS_BASE];
    if (puedeVerClasificacion) list.push("CLASIF. AUTOMÁTICA");
    list.push("");
    return list;
  }, [puedeVerClasificacion]);

  return (
    <Layout breadcrumb="Consola > Lotes">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Lotes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {lotes.length} lotes registrados
          </p>
        </div>
        {puedeCrearLote && (
          <Button type="button" className="!w-auto px-6" onClick={abrirAlta}>
            + Nuevo lote
          </Button>
        )}
      </div>

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
            No hay lotes registrados
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {puedeCrearLote
              ? 'Registrá el primer lote recibido con el botón "+ Nuevo lote".'
              : "Todavía no hay lotes registrados por Responsable de calidad."}
          </p>
        </div>
      ) : (
        <>
          {/* Tabla (md+) */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  {headers.map((h) => (
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
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {lote.destinoInicial ? DESTINO_LABEL[lote.destinoInicial] : "—"}
                    </td>
                    {puedeVerClasificacion && (
                      <td className="px-5 py-3">
                        {lote.clasificacion ? (
                          <ClasificacionLoteBadge resultado={lote.clasificacion} />
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {puedeAbrirMediciones && (
                          <button
                            type="button"
                            onClick={() => setLoteMediciones(lote)}
                            className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                            title={
                              puedeCargarMedicionManualBase || puedeVerHistorialManual
                                ? "Mediciones manuales"
                                : "Clasificación automática"
                            }
                          >
                            <FlaskConical className="h-4 w-4" />
                          </button>
                        )}
                        {puedeCrearLote && (
                          <button
                            type="button"
                            onClick={() => abrirEdicion(lote)}
                            className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                            title="Editar lote"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
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
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {puedeAbrirMediciones && (
                      <button
                        type="button"
                        onClick={() => setLoteMediciones(lote)}
                        className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                        title={
                          puedeCargarMedicionManualBase || puedeVerHistorialManual
                            ? "Mediciones manuales"
                            : "Clasificación automática"
                        }
                      >
                        <FlaskConical className="h-4 w-4" />
                      </button>
                    )}
                    {puedeCrearLote && (
                      <button
                        type="button"
                        onClick={() => abrirEdicion(lote)}
                        className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                        title="Editar lote"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {puedeVerClasificacion && (
                  <div>
                    {lote.clasificacion ? (
                      <ClasificacionLoteBadge resultado={lote.clasificacion} />
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        Sin clasificación
                      </span>
                    )}
                  </div>
                )}

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
                  <div className="col-span-2">
                    <dt className="text-slate-400 dark:text-slate-500">Destino</dt>
                    <dd className="text-slate-600 dark:text-slate-400">
                      {lote.destinoInicial ? DESTINO_LABEL[lote.destinoInicial] : "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </>
      )}

      {puedeCrearLote && (
        <LoteFormModal
          isOpen={isModalOpen}
          proveedores={proveedores}
          lote={editingLote ?? undefined}
          isSubmitting={editingLote ? isUpdating : isCreating}
          onClose={cerrarModal}
          onCreate={createLote}
          onUpdate={updateLote}
        />
      )}

      <LoteMedicionesModal
        isOpen={loteMediciones !== null}
        lote={loteMediciones}
        puedeCargarMedicionManual={
          puedeCargarMedicionManualBase &&
          loteMediciones !== null &&
          !lotesConSensorAsociado.has(loteMediciones.id)
        }
        puedeVerHistorialManual={puedeVerHistorialManual}
        puedeVerClasificacion={puedeVerClasificacion}
        puedeVerComparacionHistorica={puedeVerComparacionHistorica}
        onClose={() => setLoteMediciones(null)}
      />
    </Layout>
  );
}
