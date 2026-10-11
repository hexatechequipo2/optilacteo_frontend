import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FlaskConical, GitMerge, History, Pencil, Route, Search } from "lucide-react";
import { Layout } from "../../components/layout/Layout";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { ClasificacionLoteBadge } from "../../components/ClasificacionLoteBadge";
import { AuditoriaModal } from "../../components/AuditoriaModal";
import { useLotes } from "../../hooks/useLotes";
import { useSensores } from "../../hooks/useSensores";
import { usePermisos } from "../../hooks/usePermisos";
import { recomendacionService } from "../../services/recomendacion.service";
import type { RecomendacionDestinoItem } from "../../types/recomendacionDestino.types";
import { Badge } from "../../components/ui/Badge";
import { tieneNumeroRemito } from "../../utils/numeroRemito";
import { proveedoresService } from "../../services/proveedores.service";
import { tamboService } from "../../services/tambo.service";
import { TIPO_MATERIA_PRIMA_TABS } from "../Configuracion/constants/parametrosCalidad";
import { UBICACION_LABEL } from "../Sensores/constants/parametroSensor";
import { DestinoLote, EstadoLote, UnidadRendimiento, type Lote } from "../../types/lote.types";
import type { Proveedor } from "../../types/proveedor.types";
import type { Tambo } from "../../types/tambo.types";
import type { ModuloPermiso } from "../../types/permisos.types";
import { LoteFormModal } from "./LoteFormModal";
import { LoteMedicionesModal } from "./components/LoteMedicionesModal";
import { TrazabilidadLoteModal } from "./components/TrazabilidadLoteModal";
import { HistorialTrazabilidadModal } from "./components/HistorialTrazabilidadModal";
import { FinalizarLoteModal } from "./components/FinalizarLoteModal";
import {
  UNIDAD_RENDIMIENTO_LABEL,
  UNIDAD_RENDIMIENTO_SIMBOLO,
} from "./constants/unidadRendimiento";

// Universo suficiente para poblar el selector de proveedores del formulario
// (no es una tabla paginada: acá se necesita el catálogo completo).
const PROVEEDORES_SELECT_LIMIT = 100;

const DESTINO_LABEL: Record<DestinoLote, string> = {
  [DestinoLote.PRODUCCION]: "Producción",
  [DestinoLote.ALMACENAMIENTO]: "Almacenamiento",
  [DestinoLote.TRATAMIENTO]: "Tratamiento",
  [DestinoLote.DESCARTE]: "Descarte",
};

// HU-36: se agregan TAMBO (dato real, lote.tamboId resuelto contra
// tamboMap — reemplaza el mock de la Parte 1/2 ahora que el backend ya lo
// modela) y UBICACIÓN (dato real, lote.ubicacionInicial, que ya viajaba del
// backend pero no se mostraba en esta tabla).
const HEADERS_BASE = [
  "LOTE",
  "PROVEEDOR",
  "TAMBO",
  "MATERIA PRIMA",
  "UBICACIÓN",
  "INGRESO",
  "DESTINO",
  "RENDIMIENTO",
];

// HU-62: solo tiene sentido mostrar el rendimiento una vez que el lote está
// finalizado (es cuando el backend permite cargarlo). Antes de eso, "—"
// como el resto de los campos no aplicables todavía.
function formatRendimiento(lote: Lote): string {
  if (lote.estado !== EstadoLote.FINALIZADO) return "—";
  if (lote.rendimiento == null) return "No registrado";
  // unidadRendimiento puede faltar en lotes finalizados antes de esta
  // extensión (se guardaba solo el número); se muestra el valor solo.
  const simbolo = lote.unidadRendimiento ? UNIDAD_RENDIMIENTO_SIMBOLO[lote.unidadRendimiento] : null;
  return simbolo ? `${lote.rendimiento} ${simbolo}` : String(lote.rendimiento);
}

// HU-62 (extensión): categorización client-side por unidad de rendimiento —
// el backend todavía no expone un query param para esto en
// LoteFilterQueryDto, así que se filtra sobre los lotes ya cargados.
const FILTRO_UNIDAD_OPTIONS = [
  { value: "", label: "Todas" },
  ...Object.values(UnidadRendimiento).map((unidad) => ({
    value: unidad,
    label: UNIDAD_RENDIMIENTO_LABEL[unidad],
  })),
];

const TIPO_MATERIA_PRIMA_LABEL = new Map(TIPO_MATERIA_PRIMA_TABS.map((t) => [t.value, t.label]));

export default function LotesPage() {
  const {
    lotes,
    isLoading,
    error,
    refetch,
    createLote,
    isCreating,
    updateLote,
    isUpdating,
    finalizarLote,
    finalizandoId,
  } = useLotes();
  const { puede } = usePermisos();
  // Sin sensores_iot:ver no se puede saber qué lote tiene sensor: no se pide
  // (evita el 403) y, si se carga una medición HU-20 sobre un lote con
  // sensor, el back la rechaza con su propio mensaje.
  const { sensores } = useSensores({}, { habilitado: puede("sensores_iot", "ver") });
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [tambos, setTambos] = useState<Tambo[]>([]);
  const [filtroUnidadRendimiento, setFiltroUnidadRendimiento] = useState("");
  // HU-37: universo de recomendaciones de la empresa para aproximar, en la
  // tabla, qué lotes tienen una divergencia justificada — ver el TODO en
  // divergenciaVigentePorLote más abajo. Una sola llamada acá, no una por
  // fila (mismo patrón que proveedores/tambos, arriba).
  const [recomendacionesTodas, setRecomendacionesTodas] = useState<RecomendacionDestinoItem[]>(
    [],
  );
  useEffect(() => {
    // GET /recomendaciones/todas exige trazabilidad:ver; sin eso daría un 403
    // en cada visita (que además dispara la recarga de permisos).
    if (!puede("trazabilidad", "ver")) return;
    recomendacionService
      .getTodas()
      .then(setRecomendacionesTodas)
      .catch(() => setRecomendacionesTodas([]));
  }, [puede]);
  // TODO(backend): esto es una aproximación, no el destino vigente real de
  // cada lote (para eso, ver useDestinoProductivoLote.ts — GET
  // /lotes/:id/destino-productivo/historial — que sí es preciso pero es
  // por lote, no sirve para pintar 100 filas de una). Toma, por loteId, la
  // recomendación resuelta (aceptada o rechazada) más reciente según
  // respondidaEn y marca "divergencia" si quedó rechazada. Dos límites
  // conocidos, ambos hacia el lado de "puede sobrar el badge", nunca
  // "puede faltar" cuando realmente no hubo divergencia:
  // 1. No sabe si después hubo una asignación MANUAL (HU-34) que reemplazó
  //    ese destino — el badge puede quedar vigente aunque ya no lo esté.
  // 2. No distingue una recomendación de un consumo parcial posterior
  //    (HU-68) de la del lote original: comparten el mismo loteId y el DTO
  //    de /recomendaciones/todas no expone loteConsumoId para separarlas.
  // Por eso la tabla ya NO muestra el nombre del destino productivo vigente
  // (solo el badge de divergencia): mostrar un nombre sacado únicamente de
  // acá sería directamente incorrecto para un lote reasignado a mano
  // después de la recomendación, no solo impreciso.
  const divergenciaVigentePorLote = useMemo(() => {
    const masRecientePorLote = new Map<number, RecomendacionDestinoItem>();
    for (const r of recomendacionesTodas) {
      if (r.estado === "pendiente" || !r.respondidaEn) continue;
      const actual = masRecientePorLote.get(r.loteId);
      if (!actual || r.respondidaEn > actual.respondidaEn!) {
        masRecientePorLote.set(r.loteId, r);
      }
    }
    const mapa = new Map<number, boolean>();
    for (const [loteId, r] of masRecientePorLote) {
      mapa.set(loteId, r.estado === "rechazada");
    }
    return mapa;
  }, [recomendacionesTodas]);
  const [soloConDivergencias, setSoloConDivergencias] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLote, setEditingLote] = useState<Lote | null>(null);
  const [loteMediciones, setLoteMediciones] = useState<Lote | null>(null);
  const [loteAFinalizar, setLoteAFinalizar] = useState<Lote | null>(null);
  const [loteAuditoria, setLoteAuditoria] = useState<Lote | null>(null);
  const [loteTrazabilidadId, setLoteTrazabilidadId] = useState<number | null>(null);
  const [loteHistorialId, setLoteHistorialId] = useState<number | null>(null);

  // Cada flag usa el mismo módulo/acción que exige el endpoint en
  // lote.controller.ts (varios módulos = OR, como el guard del back).
  const LOTE: ModuloPermiso[] = ["recepcion", "trazabilidad"];
  const puedeCrearLote = puede("recepcion", "crear"); // POST /lotes
  const puedeEditarLote = puede(LOTE, "editar"); // PATCH /lotes/:id
  // PATCH /lotes/:id/finalizar. Solo se ofrece mientras el lote no llegó a
  // un estado terminal (se resuelve en la fila).
  const puedeFinalizarLote = puede(LOTE, "editar");

  // HU-63: el back manda `auditoria` en cualquier GET de lotes; se muestra
  // a quien tiene el módulo de auditoría.
  const puedeVerAuditoriaLote = puede("auditoria", "ver");

  // GET /lotes/:id/clasificaciones
  const puedeVerClasificacion = puede(["monitoreo_alertas", "trazabilidad"], "ver");
  // GET /lotes/:id/comparacion-historica
  const puedeVerComparacionHistorica = puede("trazabilidad", "ver");
  // HU-20 (POST /lotes/:id/mediciones-manuales) y HU-15 (POST
  // /sensores/lecturas/manual) exigen monitoreo_alertas:crear; cuál aplica
  // se resuelve en el modal según loteTieneSensor.
  const puedeCargarMedicionManualBase = puede("monitoreo_alertas", "crear");

  // El backend bloquea HU-20 (POST /lotes/:id/mediciones-manuales) si el lote
  // tiene CUALQUIER sensor asociado, sin importar su estado (ver
  // medicion-manual.service.ts: chequea findSensoresActualesDeLote, no
  // filtra por estado) - antes acá se filtraba por estado === "activo", lo
  // que hacía que un lote con un sensor inactivo/en falla se tratara como
  // "sin sensor" y ofreciera el form de HU-20, que el backend termina
  // rechazando con 400. Corresponde HU-15 en todos esos casos.
  const lotesConSensorAsociado = useMemo(
    () => new Set(sensores.filter((s) => s.loteActualId != null).map((s) => s.loteActualId)),
    [sensores],
  );

  // GET /lotes/:id/mediciones-manuales (lotes sin sensor) y GET
  // /sensores/lecturas/historial-mediciones (lotes con sensor): mismo permiso.
  const puedeVerHistorialManual = puede(["monitoreo_alertas", "trazabilidad"], "ver");
  const puedeVerHistorialLecturas = puedeVerHistorialManual;
  // GET /lotes/:id/consumos y /lotes/producciones
  const puedeVerTrazabilidad = puede("trazabilidad", "ver");
  // POST /lotes/:id/consumos
  const puedeRegistrarConsumo = puede("trazabilidad", "crear");
  // GET /lotes/:id/reporte-trazabilidad: el back exige ver, no exportar.
  const puedeGenerarReporteTrazabilidad = puede("trazabilidad", "ver");
  // GET /lotes/:id/trazabilidad
  const puedeVerTrazabilidadCompleta = puede("trazabilidad", "ver");

  // El ícono de la acción se ofrece si hay al menos una de las tres
  // capacidades (escribir, ver historial o ver clasificación automática);
  // qué pestañas quedan habilitadas adentro del modal se resuelve por lote
  // en el render de la fila.
  const puedeAbrirMediciones =
    puedeCargarMedicionManualBase ||
    puedeVerHistorialManual ||
    puedeVerHistorialLecturas ||
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
    // GET /proveedores exige recepcion:ver (un rol solo con trazabilidad
    // ve la tabla sin razón social, sin 403).
    if (!puede("recepcion", "ver")) return;
    proveedoresService
      .getAll({ page: 1, limit: PROVEEDORES_SELECT_LIMIT, estado: "activa" })
      .then((result) => setProveedores(result.data))
      .catch(() => setProveedores([]));
  }, [puede]);

  // HU-36: universo completo de tambos de la empresa (GET /tambos, ya
  // filtrado por activo:true del lado del backend) para resolver
  // lote.tamboId -> nombre en la tabla, mismo patrón que proveedorMap.
  useEffect(() => {
    tamboService
      .getAll()
      .then(setTambos)
      .catch(() => setTambos([]));
  }, []);

  const proveedorMap = new Map(proveedores.map((p) => [p.id, p.razonSocial]));
  const tamboMap = new Map(tambos.map((t) => [t.id, t.nombre]));

  // HU-62 (extensión): filtro client-side por unidad de rendimiento. Vacío
  // ("Todas") no filtra nada; con "" el lote no tiene rendimiento cargado
  // (no finalizado o finalizado sin rendimiento) y no matchea ninguna unidad.
  const lotesFiltrados = useMemo(() => {
    let resultado = lotes;
    if (filtroUnidadRendimiento !== "") {
      resultado = resultado.filter((lote) => lote.unidadRendimiento === filtroUnidadRendimiento);
    }
    if (soloConDivergencias) {
      resultado = resultado.filter((lote) => divergenciaVigentePorLote.get(lote.id) ?? false);
    }
    // HU-69 (AC "el listado de lotes... habilita la búsqueda por número de
    // remito"): client-side, sobre los campos ya cargados en pantalla — no
    // hay ningún query param de búsqueda combinada en GET /lotes. Los lotes
    // con 'S/D' (backfill de la migración, ver utils/numeroRemito.ts) no
    // matchean por remito: no tienen uno real que buscar.
    const termino = busqueda.trim().toLowerCase();
    if (termino !== "") {
      resultado = resultado.filter((lote) => {
        const proveedor = proveedorMap.get(lote.proveedorId) ?? "";
        const tambo = tamboMap.get(lote.tamboId) ?? "";
        const remito = tieneNumeroRemito(lote.numeroRemito) ? lote.numeroRemito : "";
        return (
          lote.codigo.toLowerCase().includes(termino) ||
          proveedor.toLowerCase().includes(termino) ||
          tambo.toLowerCase().includes(termino) ||
          remito.toLowerCase().includes(termino)
        );
      });
    }
    return resultado;
  }, [
    lotes,
    filtroUnidadRendimiento,
    soloConDivergencias,
    divergenciaVigentePorLote,
    busqueda,
    proveedorMap,
    tamboMap,
  ]);

  // HU-37: cuenta sobre el universo ya filtrado por unidad de rendimiento
  // (no sobre `lotes` sin filtrar), para que el número del checkbox
  // coincida con lo que efectivamente se puede llegar a ver.
  const cantidadConDivergencias = useMemo(() => {
    const base =
      filtroUnidadRendimiento === ""
        ? lotes
        : lotes.filter((lote) => lote.unidadRendimiento === filtroUnidadRendimiento);
    return base.filter((lote) => divergenciaVigentePorLote.get(lote.id) ?? false).length;
  }, [lotes, filtroUnidadRendimiento, divergenciaVigentePorLote]);

  // HU-68: se busca por id en la lista ya cargada (no un GET /lotes/:id
  // aparte) para que, tras registrar un consumo y refetchear /lotes, el
  // panel reciba el lote con cantidadDisponible actualizado sin depender de
  // un endpoint que no incluye a Responsable de Producción entre sus roles.
  const loteTrazabilidad = useMemo(
    () => lotes.find((l) => l.id === loteTrazabilidadId) ?? null,
    [lotes, loteTrazabilidadId],
  );

  const loteHistorial = useMemo(
    () => lotes.find((l) => l.id === loteHistorialId) ?? null,
    [lotes, loteHistorialId],
  );

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
            {lotesFiltrados.length} lotes registrados
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={soloConDivergencias}
              onChange={(e) => setSoloConDivergencias(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
            />
            Solo lotes con divergencias justificadas ({cantidadConDivergencias})
          </label>
          <Select
            id="filtro-unidad-rendimiento"
            label="Unidad de rendimiento"
            options={FILTRO_UNIDAD_OPTIONS}
            value={filtroUnidadRendimiento}
            onChange={(e) => setFiltroUnidadRendimiento(e.target.value)}
            className="!py-1.5 text-sm"
          />
          {puedeCrearLote && (
            <Button type="button" className="!w-auto px-6" onClick={abrirAlta}>
              + Nuevo lote
            </Button>
          )}
        </div>
      </div>

      {/* HU-69: búsqueda client-side por código de lote, proveedor, tambo o
          número de remito — no hay query param combinado en GET /lotes. */}
      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por lote, proveedor, tambo o nº de remito..."
          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
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
      ) : lotesFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-base font-medium text-slate-700 dark:text-slate-300">
            Ningún lote coincide con el filtro
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {/* HU-69: el buscador es un filtro más sobre lotesFiltrados —
                sin este caso, una búsqueda sin resultados caía en el mensaje
                del filtro de rendimiento (con "undefined" si ese filtro no
                estaba activo). Se prioriza porque es el más específico: si
                hay texto buscado, es la razón más probable del vacío. */}
            {busqueda.trim() !== ""
              ? `Ningún lote coincide con "${busqueda.trim()}".`
              : soloConDivergencias
                ? "No hay lotes con divergencias justificadas que coincidan con el resto de los filtros."
                : `No hay lotes finalizados con rendimiento en ${UNIDAD_RENDIMIENTO_LABEL[filtroUnidadRendimiento as UnidadRendimiento]?.toLowerCase()}.`}
          </p>
        </div>
      ) : (
        <>
          {/* Tabla (md+) */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
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
                {lotesFiltrados.map((lote) => (
                  <tr key={lote.id} className="text-sm">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-slate-900 dark:text-white">
                      <div className="flex flex-col gap-0.5">
                        <span>{lote.codigo}</span>
                        {tieneNumeroRemito(lote.numeroRemito) && (
                          <span className="font-sans text-[11px] font-normal text-slate-400 dark:text-slate-500">
                            Nº remito: {lote.numeroRemito}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                      {proveedorMap.get(lote.proveedorId) ?? `Proveedor #${lote.proveedorId}`}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {tamboMap.get(lote.tamboId) ?? `Tambo #${lote.tamboId}`}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {TIPO_MATERIA_PRIMA_LABEL.get(lote.materiaPrima) ?? lote.materiaPrima}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {lote.ubicacionInicial ? UBICACION_LABEL[lote.ubicacionInicial] : "—"}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {new Date(lote.fechaIngreso).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-slate-600 dark:text-slate-400">
                          {lote.destinoInicial ? DESTINO_LABEL[lote.destinoInicial] : "—"}
                        </span>
                        {/* HU-37: el nombre del destino productivo vigente
                            se ve en el detalle del lote (Editar lote /
                            Historial de trazabilidad) — acá, ver el TODO de
                            divergenciaVigentePorLote arriba, solo se puede
                            aproximar el badge de forma confiable. */}
                        {divergenciaVigentePorLote.get(lote.id) && (
                          <Badge variant="warning">Divergencia</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {formatRendimiento(lote)}
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
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {puedeAbrirMediciones && (
                          <button
                            type="button"
                            onClick={() => setLoteMediciones(lote)}
                            className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                            title={
                              puedeCargarMedicionManualBase ||
                              puedeVerHistorialManual ||
                              puedeVerHistorialLecturas
                                ? "Mediciones"
                                : "Clasificación automática"
                            }
                          >
                            <FlaskConical className="h-4 w-4" />
                          </button>
                        )}
                        {puedeVerTrazabilidad && (
                          <button
                            type="button"
                            onClick={() => setLoteTrazabilidadId(lote.id)}
                            className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                            title="Trazabilidad y consumo parcial"
                          >
                            <Route className="h-4 w-4" />
                          </button>
                        )}
                        {puedeVerTrazabilidadCompleta && (
                          <button
                            type="button"
                            onClick={() => setLoteHistorialId(lote.id)}
                            className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                            title="Historial de trazabilidad completo"
                          >
                            <GitMerge className="h-4 w-4" />
                          </button>
                        )}
                        {puedeEditarLote && (
                          <button
                            type="button"
                            onClick={() => abrirEdicion(lote)}
                            className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                            title="Editar lote"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {puedeFinalizarLote &&
                          (lote.estado === EstadoLote.REGISTRADO || lote.estado === EstadoLote.EN_PROCESO) && (
                            <button
                              type="button"
                              onClick={() => setLoteAFinalizar(lote)}
                              className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
                              title="Finalizar lote"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                        {puedeVerAuditoriaLote && lote.auditoria && (
                          <button
                            type="button"
                            onClick={() => setLoteAuditoria(lote)}
                            className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                            title="Auditoría"
                          >
                            <History className="h-4 w-4" />
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
            {lotesFiltrados.map((lote) => (
              <div
                key={lote.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs font-medium text-slate-900 dark:text-white">
                      {lote.codigo}
                    </p>
                    {tieneNumeroRemito(lote.numeroRemito) && (
                      <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                        Nº remito: {lote.numeroRemito}
                      </p>
                    )}
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
                          puedeCargarMedicionManualBase ||
                          puedeVerHistorialManual ||
                          puedeVerHistorialLecturas
                            ? "Mediciones"
                            : "Clasificación automática"
                        }
                      >
                        <FlaskConical className="h-4 w-4" />
                      </button>
                    )}
                    {puedeVerTrazabilidad && (
                      <button
                        type="button"
                        onClick={() => setLoteTrazabilidadId(lote.id)}
                        className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                        title="Trazabilidad y consumo parcial"
                      >
                        <Route className="h-4 w-4" />
                      </button>
                    )}
                    {puedeVerTrazabilidadCompleta && (
                      <button
                        type="button"
                        onClick={() => setLoteHistorialId(lote.id)}
                        className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                        title="Historial de trazabilidad completo"
                      >
                        <GitMerge className="h-4 w-4" />
                      </button>
                    )}
                    {puedeEditarLote && (
                      <button
                        type="button"
                        onClick={() => abrirEdicion(lote)}
                        className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                        title="Editar lote"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    {puedeFinalizarLote &&
                      (lote.estado === EstadoLote.REGISTRADO || lote.estado === EstadoLote.EN_PROCESO) && (
                        <button
                          type="button"
                          onClick={() => setLoteAFinalizar(lote)}
                          className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
                          title="Finalizar lote"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}
                    {puedeVerAuditoriaLote && lote.auditoria && (
                      <button
                        type="button"
                        onClick={() => setLoteAuditoria(lote)}
                        className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                        title="Auditoría"
                      >
                        <History className="h-4 w-4" />
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
                    <dt className="text-slate-400 dark:text-slate-500">Tambo</dt>
                    <dd className="text-slate-600 dark:text-slate-400">
                      {tamboMap.get(lote.tamboId) ?? `Tambo #${lote.tamboId}`}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500">Materia prima</dt>
                    <dd className="text-slate-600 dark:text-slate-400">
                      {TIPO_MATERIA_PRIMA_LABEL.get(lote.materiaPrima) ?? lote.materiaPrima}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500">Ubicación</dt>
                    <dd className="text-slate-600 dark:text-slate-400">
                      {lote.ubicacionInicial ? UBICACION_LABEL[lote.ubicacionInicial] : "—"}
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
                  <div className="col-span-2">
                    <dt className="text-slate-400 dark:text-slate-500">Destino productivo</dt>
                    <dd>
                      {/* HU-37: ver el TODO de divergenciaVigentePorLote —
                          el nombre del destino vigente se ve en el detalle
                          del lote, acá solo el badge aproximado. */}
                      {divergenciaVigentePorLote.get(lote.id) ? (
                        <Badge variant="warning">Divergencia</Badge>
                      ) : (
                        <span className="italic text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-slate-400 dark:text-slate-500">Rendimiento</dt>
                    <dd className="text-slate-600 dark:text-slate-400">{formatRendimiento(lote)}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </>
      )}

      {puedeEditarLote && (
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
        puedeCargarMedicionManual={puedeCargarMedicionManualBase && loteMediciones !== null}
        puedeVerHistorialManual={puedeVerHistorialManual}
        puedeVerHistorialLecturas={puedeVerHistorialLecturas}
        loteTieneSensor={loteMediciones !== null && lotesConSensorAsociado.has(loteMediciones.id)}
        puedeVerClasificacion={puedeVerClasificacion}
        puedeVerComparacionHistorica={puedeVerComparacionHistorica}
        onClose={() => setLoteMediciones(null)}
      />

      <TrazabilidadLoteModal
        isOpen={loteTrazabilidadId !== null}
        lote={loteTrazabilidad}
        proveedorMap={proveedorMap}
        tamboMap={tamboMap}
        puedeRegistrarConsumo={puedeRegistrarConsumo}
        puedeGenerarReporte={puedeGenerarReporteTrazabilidad}
        onClose={() => setLoteTrazabilidadId(null)}
        onConsumoRegistrado={() => void refetch()}
      />

      <HistorialTrazabilidadModal
        isOpen={loteHistorialId !== null}
        loteId={loteHistorialId}
        lote={loteHistorial}
        proveedorMap={proveedorMap}
        tamboMap={tamboMap}
        onClose={() => setLoteHistorialId(null)}
      />

      <FinalizarLoteModal
        isOpen={loteAFinalizar !== null}
        lote={loteAFinalizar}
        isSubmitting={loteAFinalizar !== null && finalizandoId === loteAFinalizar.id}
        onClose={() => setLoteAFinalizar(null)}
        onConfirm={finalizarLote}
      />

      <AuditoriaModal
        isOpen={loteAuditoria !== null}
        titulo={`Auditoría — ${loteAuditoria?.codigo ?? ""}`}
        auditoria={loteAuditoria?.auditoria}
        onClose={() => setLoteAuditoria(null)}
      />
    </Layout>
  );
}