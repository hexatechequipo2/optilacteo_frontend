import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FlaskConical, GitMerge, History, Pencil, Route, Search } from "lucide-react";
import { Layout } from "../../components/layout/Layout";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { Tabs } from "../../components/ui/Tabs";
import { ClasificacionLoteBadge } from "../../components/ClasificacionLoteBadge";
import { AuditoriaModal } from "../../components/AuditoriaModal";
import { useLotes } from "../../hooks/useLotes";
import { useSensores } from "../../hooks/useSensores";
import { useAuth } from "../../hooks/useAuth";
import { useTodosDestinoManualLote } from "../../hooks/useDestinoProductivoManual";
import { useTodosDestinoRecomendacionLote } from "../../hooks/useDestinoProductivoRecomendacion";
import {
  calcularDestinoVigente,
  esDivergenciaVigente,
  type DestinoVigente,
} from "../../utils/destinoProductivoVigente";
import { Badge } from "../../components/ui/Badge";
import { useTodosRemitoLote } from "../../hooks/useRemitoLote";
import { proveedoresService } from "../../services/proveedores.service";
import { tamboService } from "../../services/tambo.service";
import { puedeVerAuditoria } from "../../utils/auditoriaVisibility";
import { TIPO_MATERIA_PRIMA_TABS } from "../Configuracion/constants/parametrosCalidad";
import { UBICACION_LABEL } from "../Sensores/constants/parametroSensor";
import { DestinoLote, EstadoLote, UnidadRendimiento, type Lote } from "../../types/lote.types";
import type { Proveedor } from "../../types/proveedor.types";
import type { Tambo } from "../../types/tambo.types";
import { LoteFormModal } from "./LoteFormModal";
import { LoteMedicionesModal } from "./components/LoteMedicionesModal";
import { TrazabilidadLoteModal } from "./components/TrazabilidadLoteModal";
import { HistorialTrazabilidadModal } from "./components/HistorialTrazabilidadModal";
import { FinalizarLoteModal } from "./components/FinalizarLoteModal";
import { EvolucionIndicadoresTab } from "./components/EvolucionIndicadoresTab";
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

// HU-39: se agrega el tab "Historial de mediciones" (gráfico de evolución
// de indicadores) junto a la tabla de lotes. "Desvíos por proveedor" del
// prototipo (Figura 2, sprint 4) queda deliberadamente afuera de este
// cambio — hoy vive como modal en Proveedores (DesviosProveedorModal.tsx),
// y moverlo ahí es una decisión de navegación aparte, no parte de HU-39.
type TabLotes = "lotes" | "historial-mediciones";

const TABS_LOTES: { value: TabLotes; label: string }[] = [
  { value: "lotes", label: "Lotes" },
  { value: "historial-mediciones", label: "Historial de mediciones" },
];

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
  const { user } = useAuth();
  const { sensores } = useSensores();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [tambos, setTambos] = useState<Tambo[]>([]);
  const [filtroUnidadRendimiento, setFiltroUnidadRendimiento] = useState("");
  const [tabActiva, setTabActiva] = useState<TabLotes>("lotes");
  // HU-34/HU-37 (mock visual): ver useDestinoProductivoManual.ts /
  // useDestinoProductivoRecomendacion.ts — el backend todavía no expone un
  // endpoint para el destino productivo de un lote, así que esto vive en
  // localStorage (uno por origen) hasta que exista ese endpoint.
  const destinoManualPorLote = useTodosDestinoManualLote();
  const destinoRecomendacionPorLote = useTodosDestinoRecomendacionLote();
  // Combina los dos stores por lote (ver utils/destinoProductivoVigente.ts)
  // una sola vez acá, en vez de recalcularlo en cada fila de la tabla.
  const idsConDestino = useMemo(
    () =>
      new Set([
        ...Object.keys(destinoManualPorLote).map(Number),
        ...Object.keys(destinoRecomendacionPorLote).map(Number),
      ]),
    [destinoManualPorLote, destinoRecomendacionPorLote],
  );
  const destinoVigentePorLote = useMemo(() => {
    const mapa = new Map<number, DestinoVigente | null>();
    for (const loteId of idsConDestino) {
      mapa.set(
        loteId,
        calcularDestinoVigente(
          destinoManualPorLote[loteId] ?? null,
          destinoRecomendacionPorLote[loteId] ?? null,
        ),
      );
    }
    return mapa;
  }, [idsConDestino, destinoManualPorLote, destinoRecomendacionPorLote]);
  const divergenciaVigentePorLote = useMemo(() => {
    const mapa = new Map<number, boolean>();
    for (const loteId of idsConDestino) {
      mapa.set(
        loteId,
        esDivergenciaVigente(
          destinoManualPorLote[loteId] ?? null,
          destinoRecomendacionPorLote[loteId] ?? null,
        ),
      );
    }
    return mapa;
  }, [idsConDestino, destinoManualPorLote, destinoRecomendacionPorLote]);
  const [soloConDivergencias, setSoloConDivergencias] = useState(false);
  // HU-69 (mock visual): ver useRemitoLote.ts.
  const remitoPorLote = useTodosRemitoLote();
  const [busqueda, setBusqueda] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLote, setEditingLote] = useState<Lote | null>(null);
  const [loteMediciones, setLoteMediciones] = useState<Lote | null>(null);
  const [loteAFinalizar, setLoteAFinalizar] = useState<Lote | null>(null);
  const [loteAuditoria, setLoteAuditoria] = useState<Lote | null>(null);
  const [loteTrazabilidadId, setLoteTrazabilidadId] = useState<number | null>(null);
  const [loteHistorialId, setLoteHistorialId] = useState<number | null>(null);

  // Solo Responsable de calidad puede registrar/editar lotes (POST y PATCH
  // /lotes en el backend); Gerente/Administrador acceden a esta pantalla en
  // modo lectura.
  //
  // HU-36 (trazabilidad de origen del lote) redacta el criterio como "Como
  // operario de línea, quiero registrar el proveedor y tambo de origen...".
  // Verificado con el usuario al implementar esta HU: ese texto quedó
  // desactualizado por una decisión de producto anterior (HU-60, ver
  // lote.controller.ts en el backend y el comentario de la ruta /lotes en
  // App.tsx) que movió el alta de lotes de Operario de línea a Responsable
  // de calidad — Operario de línea solo carga mediciones manuales sobre
  // lotes ya existentes (HU-20), no da de alta el lote en sí. No es una
  // inconsistencia introducida por HU-36; se hereda de HU-60 y ya está
  // implementada igual en frontend y backend. Se deja anotado acá para que
  // quede trazable en el código, no solo en la conversación.
  const puedeCrearLote = user?.rolNombre === "Responsable de calidad";
  const puedeEditarLote =
    user?.rolNombre === "Responsable de calidad" ||
    user?.rolNombre === "Responsable de producción";

  // HU-63: quién creó el lote y, si aplica, quién lo modificó por última
  // vez. El backend manda el bloque `auditoria` para cualquier rol que
  // pueda leer /lotes (no lo gatea); la restricción a Gerente/Administrador
  // se aplica acá (ver utils/auditoriaVisibility.ts).
  const puedeVerAuditoriaLote = puedeVerAuditoria(user?.rolNombre);

  // HU-62: PATCH /lotes/:id/finalizar amplió el rol habilitado a
  // Responsable de calidad y Responsable de Producción (antes exclusivo de
  // calidad). Comparación normalizada, mismo criterio que el resto de los
  // checks de este archivo. Solo tiene sentido ofrecerla mientras el lote
  // no llegó todavía a un estado terminal (finalizado/rechazado, este
  // último decidido por HU-22 vía revisión de calidad).
  const puedeFinalizarLote = useMemo(() => {
    const rol = (user?.rolNombre ?? "").trim().toLowerCase();
    return rol === "responsable de calidad" || rol === "responsable de producción";
  }, [user?.rolNombre]);

  // HU-21: GET /lotes/:id/clasificaciones (backend, lote.controller.ts)
  // permite Responsable de calidad, Gerente y Administrador — no es
  // exclusivo de quien puede crear lotes. Comparación normalizada, mismo
  // criterio que puedeVerComparacionHistorica.
  const puedeVerClasificacion = useMemo(() => {
    const rol = (user?.rolNombre ?? "").trim().toLowerCase();
    return rol === "responsable de calidad" || rol === "gerente" || rol === "administrador";
  }, [user?.rolNombre]);

  // HU-24: comparación histórica — @Roles del backend (lote.controller.ts)
  // permite Responsable de calidad, Gerente y Administrador (más amplio que
  // HU-21). Comparación normalizada, mismo criterio que puedeVerHistorialManual.
  const puedeVerComparacionHistorica = useMemo(() => {
    const rol = (user?.rolNombre ?? "").trim().toLowerCase();
    return rol === "responsable de calidad" || rol === "gerente" || rol === "administrador";
  }, [user?.rolNombre]);

  // Capacidad base (solo rol) de cargar una medición manual para un lote:
  // exclusiva de Operario de línea tanto en HU-20 (POST
  // /lotes/:id/mediciones-manuales, respaldo total sin sensor) como en HU-15
  // (POST /sensores/lecturas/manual, fallback por sensor puntual). Cuál de
  // los dos aplica se resuelve en el modal según loteTieneSensor - HU-20 se
  // rechaza con 400 si el lote tiene cualquier sensor asociado.
  const puedeCargarMedicionManualBase = useMemo(() => {
    const rol = (user?.rolNombre ?? "").trim().toLowerCase();
    return rol === "operario de línea";
  }, [user?.rolNombre]);

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

  // GET /lotes/:id/mediciones-manuales (HU-20, backend): Operario de línea,
  // Responsable de producción, Gerente y Administrador. Responsable de
  // calidad no está habilitado ahí. Comparación normalizada (trim +
  // lowercase), mismo criterio que puedeVerHistorial en SensoresPage.
  // Solo aplica a lotes SIN sensor asociado (ver loteTieneSensor).
  const puedeVerHistorialManual = useMemo(() => {
    const rol = (user?.rolNombre ?? "").trim().toLowerCase();
    return (
      rol === "operario de línea" ||
      rol === "responsable de producción" ||
      rol === "gerente" ||
      rol === "administrador"
    );
  }, [user?.rolNombre]);

  // GET /sensores/lecturas/historial-mediciones (HU-19, backend):
  // Responsable de producción, Gerente y Administrador - NO Operario de
  // línea (a diferencia de puedeVerHistorialManual). Se usa para lotes CON
  // sensor asociado (HU-15): ahí el historial real vive en sensor_lecturas,
  // no en mediciones_manuales_lote.
  const puedeVerHistorialLecturas = useMemo(() => {
    const rol = (user?.rolNombre ?? "").trim().toLowerCase();
    return rol === "responsable de producción" || rol === "gerente" || rol === "administrador";
  }, [user?.rolNombre]);

  // HU-68: GET /lotes/:id/consumos (backend) — Responsable de calidad,
  // Responsable de producción, Gerente y Administrador. Mismo set de roles
  // que GET /lotes/producciones, así que alcanza con esta única flag para
  // decidir si se ofrece el ícono de trazabilidad.
  const puedeVerTrazabilidad = useMemo(() => {
    const rol = (user?.rolNombre ?? "").trim().toLowerCase();
    return (
      rol === "responsable de calidad" ||
      rol === "responsable de producción" ||
      rol === "gerente" ||
      rol === "administrador"
    );
  }, [user?.rolNombre]);

  // HU-68: POST /lotes/:id/consumos (backend) — solo Responsable de calidad
  // y Responsable de producción pueden registrar un consumo parcial;
  // Gerente/Administrador ven el panel de trazabilidad en modo lectura.
  const puedeRegistrarConsumo = useMemo(() => {
    const rol = (user?.rolNombre ?? "").trim().toLowerCase();
    return rol === "responsable de calidad" || rol === "responsable de producción";
  }, [user?.rolNombre]);

  // HU-32: GET /lotes/:id/trazabilidad (backend) — Responsable de calidad,
  // Gerente, Administrador. A diferencia de puedeVerTrazabilidad (que gatea
  // el panel de consumo parcial de HU-68), este NO incluye a Responsable de
  // producción — ver lote.controller.ts.
  const puedeVerTrazabilidadCompleta = useMemo(() => {
    const rol = (user?.rolNombre ?? "").trim().toLowerCase();
    return rol === "responsable de calidad" || rol === "gerente" || rol === "administrador";
  }, [user?.rolNombre]);

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
    proveedoresService
      .getAll({ page: 1, limit: PROVEEDORES_SELECT_LIMIT, estado: "activa" })
      .then((result) => setProveedores(result.data))
      .catch(() => setProveedores([]));
  }, []);

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
    // hay ningún query param de búsqueda combinada en GET /lotes.
    const termino = busqueda.trim().toLowerCase();
    if (termino !== "") {
      resultado = resultado.filter((lote) => {
        const proveedor = proveedorMap.get(lote.proveedorId) ?? "";
        const tambo = tamboMap.get(lote.tamboId) ?? "";
        const remito = remitoPorLote[lote.id]?.numeroRemito ?? "";
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
    remitoPorLote,
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
          {tabActiva === "lotes" && (
            <>
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
            </>
          )}
          {puedeCrearLote && (
            <Button type="button" className="!w-auto px-6" onClick={abrirAlta}>
              + Nuevo lote
            </Button>
          )}
        </div>
      </div>

      {tabActiva === "lotes" && (
        // HU-69: búsqueda client-side por código de lote, proveedor, tambo o
        // número de remito — no hay query param combinado en GET /lotes.
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
      )}

      <div className="mb-6">
        <Tabs tabs={TABS_LOTES} value={tabActiva} onChange={setTabActiva} />
      </div>

      {tabActiva === "historial-mediciones" ? (
        <EvolucionIndicadoresTab />
      ) : (
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
                        {remitoPorLote[lote.id] && (
                          <span className="font-sans text-[11px] font-normal text-slate-400 dark:text-slate-500">
                            Nº remito: {remitoPorLote[lote.id].numeroRemito}
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
                        {destinoVigentePorLote.get(lote.id) ? (
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="text-slate-400 dark:text-slate-500">Productivo:</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {destinoVigentePorLote.get(lote.id)!.destinoActualNombre}
                            </span>
                            {divergenciaVigentePorLote.get(lote.id) && (
                              <Badge variant="warning">Divergencia</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-400 dark:text-slate-500">
                            Sin destino productivo asignado
                          </span>
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
                    {remitoPorLote[lote.id] && (
                      <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                        Nº remito: {remitoPorLote[lote.id].numeroRemito}
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
                      {destinoVigentePorLote.get(lote.id) ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-blue-600 dark:text-blue-400">
                            {destinoVigentePorLote.get(lote.id)!.destinoActualNombre}
                          </span>
                          {divergenciaVigentePorLote.get(lote.id) && (
                            <Badge variant="warning">Divergencia</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="italic text-slate-400 dark:text-slate-500">Sin asignar</span>
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