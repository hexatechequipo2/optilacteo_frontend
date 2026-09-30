import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Pencil,
  Plus,
  Search,
  SignalZero,
} from "lucide-react";
import { Layout } from "../../components/layout/Layout";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import {
  CATEGORIA_META,
  DIAS_AVISO_CALIBRACION,
  EQUIPOS,
  EQUIPO_SECTOR,
  ESTADO_META,
  construirDispositivosMock,
  diasHastaCalibracion,
  type CategoriaDispositivo,
  type Dispositivo,
  type EstadoDispositivo,
} from "./constants/dispositivos";
import { DispositivoFormModal } from "./components/DispositivoFormModal";
import { DispositivoDetalleModal } from "./components/DispositivoDetalleModal";

const TODOS = "__todos__";

function formatearHace(iso: string | null, ahora: number): string {
  if (!iso) return "Sin reportes";
  const diffSeg = Math.floor((ahora - new Date(iso).getTime()) / 1000);
  if (diffSeg < 60) return `hace ${Math.max(diffSeg, 0)} s`;
  if (diffSeg < 3600) return `${new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} (hace ${Math.floor(diffSeg / 60)} min)`;
  if (diffSeg < 86400) return `${new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} (hace ${Math.floor(diffSeg / 3600)} h)`;
  return `${new Date(iso).toLocaleDateString("es-AR")} (hace ${Math.floor(diffSeg / 86400)} d)`;
}

interface AlertaResumen {
  titulo: string;
  descripcion: string;
  icon: typeof AlertTriangle;
  className: string;
  iconClassName: string;
  dispositivos: Dispositivo[];
}

export default function DispositivosPage() {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>(() => construirDispositivosMock());
  const [equipoFiltro, setEquipoFiltro] = useState(TODOS);
  const [categoriaFiltro, setCategoriaFiltro] = useState(TODOS);
  const [estadoFiltro, setEstadoFiltro] = useState(TODOS);
  const [incluirBaja, setIncluirBaja] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [dispositivoEnEdicion, setDispositivoEnEdicion] = useState<Dispositivo | null>(null);
  const [dispositivoDetalle, setDispositivoDetalle] = useState<Dispositivo | null>(null);
  const [equipoDesdeAlerta, setEquipoDesdeAlerta] = useState<string | null>(null);

  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setAhora(Date.now()), 15_000);
    return () => clearInterval(interval);
  }, []);
  const hoy = useMemo(() => new Date(), []);

  const enServicio = dispositivos.filter((d) => !d.bajaLogica);
  const contadorSensores = enServicio.filter((d) => d.categoria !== "actuador").length;
  const contadorActuadores = enServicio.filter((d) => d.categoria === "actuador").length;
  const contadorBaja = dispositivos.length - enServicio.length;

  const alertas: AlertaResumen[] = useMemo(() => {
    const fallaSensor = enServicio.filter((d) => d.estado === "falla_sensor");
    const sinSenal = enServicio.filter((d) => d.estado === "sin_senal");
    const vencidas = enServicio.filter((d) => diasHastaCalibracion(d.fechaCalibracion, hoy) < 0);
    const proximasAVencer = enServicio.filter((d) => {
      const dias = diasHastaCalibracion(d.fechaCalibracion, hoy);
      return dias >= 0 && dias <= DIAS_AVISO_CALIBRACION;
    });

    const detalleCalibracion = (lista: Dispositivo[], vencidas: boolean) =>
      lista
        .map((d) => {
          const dias = Math.abs(diasHastaCalibracion(d.fechaCalibracion, hoy));
          return `${d.nombre} (calibración ${vencidas ? "vencida hace" : "vence en"} ${dias} d)`;
        })
        .join(" · ");

    const resultado: AlertaResumen[] = [];
    if (fallaSensor.length > 0) {
      resultado.push({
        titulo: `Falla de sensor: ${fallaSensor.length} dispositivo${fallaSensor.length > 1 ? "s" : ""}`,
        descripcion: fallaSensor.map((d) => d.nombre).join(" · "),
        icon: AlertTriangle,
        className: "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10",
        iconClassName: "text-red-600 dark:text-red-400",
        dispositivos: fallaSensor,
      });
    }
    if (sinSenal.length > 0) {
      resultado.push({
        titulo: `Sin señal: ${sinSenal.length} dispositivo${sinSenal.length > 1 ? "s" : ""}`,
        descripcion: sinSenal.map((d) => d.nombre).join(" · "),
        icon: SignalZero,
        className: "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10",
        iconClassName: "text-amber-600 dark:text-amber-400",
        dispositivos: sinSenal,
      });
    }
    if (vencidas.length > 0) {
      resultado.push({
        titulo: `Calibración vencida: ${vencidas.length} dispositivos`,
        descripcion: detalleCalibracion(vencidas, true),
        icon: Clock,
        className: "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10",
        iconClassName: "text-red-600 dark:text-red-400",
        dispositivos: vencidas,
      });
    }
    if (proximasAVencer.length > 0) {
      resultado.push({
        titulo: `Calibración próxima a vencer: ${proximasAVencer.length} dispositivos`,
        descripcion: detalleCalibracion(proximasAVencer, false),
        icon: Clock,
        className: "border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10",
        iconClassName: "text-amber-600 dark:text-amber-400",
        dispositivos: proximasAVencer,
      });
    }
    return resultado;
  }, [enServicio, hoy]);

  const dispositivosFiltrados = dispositivos.filter((d) => {
    if (!incluirBaja && d.bajaLogica) return false;
    if (equipoFiltro !== TODOS && d.equipo !== equipoFiltro) return false;
    if (categoriaFiltro !== TODOS && d.categoria !== categoriaFiltro) return false;
    if (estadoFiltro !== TODOS && d.estado !== estadoFiltro) return false;
    return true;
  });

  const grupos = EQUIPOS.map((equipo) => ({
    equipo,
    dispositivos: dispositivosFiltrados.filter((d) => d.equipo === equipo),
  })).filter((g) => g.dispositivos.length > 0);

  const numerosSerieExistentes = new Set(
    dispositivos.map((d) => d.numeroSerie.trim().toLowerCase()),
  );

  const abrirAlta = () => {
    setDispositivoEnEdicion(null);
    setIsFormOpen(true);
  };

  const abrirEdicion = (d: Dispositivo) => {
    setDispositivoEnEdicion(d);
    setIsFormOpen(true);
  };

  const handleGuardar = (
    dto: Omit<Dispositivo, "id" | "estado" | "ultimoDato" | "bajaLogica" | "conexionPosible">,
  ) => {
    if (dispositivoEnEdicion) {
      setDispositivos((prev) =>
        prev.map((d) => (d.id === dispositivoEnEdicion.id ? { ...d, ...dto } : d)),
      );
    } else {
      const nuevoId = Math.max(0, ...dispositivos.map((d) => d.id)) + 1;
      setDispositivos((prev) => [
        ...prev,
        {
          ...dto,
          id: nuevoId,
          codigo: `D-${String(nuevoId).padStart(2, "0")}`,
          estado: "activo",
          ultimoDato: null,
          bajaLogica: false,
          conexionPosible: false,
        },
      ]);
    }
  };

  return (
    <Layout breadcrumb="Consola > Dispositivos">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dispositivos
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {enServicio.length} dispositivos en servicio · {contadorSensores} sensores y{" "}
            {contadorActuadores} actuadores
            {contadorBaja > 0 && ` · ${contadorBaja} dado${contadorBaja > 1 ? "s" : ""} de baja`}
          </p>
        </div>
        <button
          type="button"
          onClick={abrirAlta}
          className="flex items-center gap-1.5 rounded-md bg-[#3d6fcf] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3460b5]"
        >
          <Plus className="h-4 w-4" /> Nuevo dispositivo
        </button>
      </div>

      {alertas.length > 0 && (
        <div className="mb-6 flex flex-col gap-3">
          {alertas.map((alerta) => {
            const Icon = alerta.icon;
            return (
              <div
                key={alerta.titulo}
                className={`flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${alerta.className}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${alerta.iconClassName}`} />
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{alerta.titulo}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{alerta.descripcion}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEquipoDesdeAlerta(alerta.dispositivos[0]?.equipo ?? null)}
                  className="flex-shrink-0 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Ver
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          id="disp-filtro-equipo"
          label="Equipo"
          options={[
            { value: TODOS, label: "Todos los equipos" },
            ...EQUIPOS.map((e) => ({ value: e, label: e })),
          ]}
          value={equipoDesdeAlerta ?? equipoFiltro}
          onChange={(e) => {
            setEquipoDesdeAlerta(null);
            setEquipoFiltro(e.target.value);
          }}
        />
        <Select
          id="disp-filtro-categoria"
          label="Categoría"
          options={[
            { value: TODOS, label: "Todas las categorías" },
            ...(Object.entries(CATEGORIA_META) as [CategoriaDispositivo, { label: string }][]).map(
              ([value, meta]) => ({ value, label: meta.label }),
            ),
          ]}
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
        />
        <Select
          id="disp-filtro-estado"
          label="Estado"
          options={[
            { value: TODOS, label: "Todos los estados" },
            ...(Object.entries(ESTADO_META) as [EstadoDispositivo, { label: string; variant: string }][]).map(
              ([value, meta]) => ({ value, label: meta.label }),
            ),
          ]}
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
        />
        <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={incluirBaja}
            onChange={(e) => setIncluirBaja(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
          />
          Incluir dados de baja
        </label>
      </div>

      {grupos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-base font-medium text-slate-700 dark:text-slate-300">
            No se encontraron dispositivos
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Probá ajustar los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grupos.map((grupo) => (
            <div
              key={grupo.equipo}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">{grupo.equipo}</span>
                  <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">
                    {EQUIPO_SECTOR[grupo.equipo]}
                  </span>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {grupo.dispositivos.length} dispositivos
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:text-slate-500">
                      <th className="px-5 py-2">Dispositivo</th>
                      <th className="px-5 py-2">Categoría</th>
                      <th className="px-5 py-2">Estado</th>
                      <th className="px-5 py-2">Último dato</th>
                      <th className="px-5 py-2">Calibración</th>
                      <th className="px-5 py-2">Origen</th>
                      <th className="px-5 py-2 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {grupo.dispositivos.map((d) => {
                      const estadoMeta = ESTADO_META[d.estado];
                      const dias = diasHastaCalibracion(d.fechaCalibracion, hoy);
                      const calibracionTexto =
                        dias < 0
                          ? `Vencida hace ${Math.abs(dias)} d`
                          : dias <= DIAS_AVISO_CALIBRACION
                            ? `Vence en ${dias} d`
                            : `Vigente hasta ${new Date(`${d.fechaCalibracion}T00:00:00`).toLocaleDateString("es-AR")}`;
                      const calibracionVariant = dias < 0 ? "danger" : dias <= DIAS_AVISO_CALIBRACION ? "warning" : "success";

                      return (
                        <tr key={d.id} className={d.bajaLogica ? "opacity-60" : ""}>
                          <td className="px-5 py-3">
                            <p className="font-medium text-slate-900 dark:text-white">
                              {d.nombre}
                              {d.bajaLogica && (
                                <span className="ml-2 text-xs font-normal text-slate-400">
                                  (dado de baja)
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              {d.codigo} · {d.numeroSerie}
                            </p>
                          </td>
                          <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                            {CATEGORIA_META[d.categoria].label}
                          </td>
                          <td className="px-5 py-3">
                            <Badge variant={estadoMeta.variant}>{estadoMeta.label}</Badge>
                          </td>
                          <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                            {formatearHace(d.ultimoDato, ahora)}
                          </td>
                          <td className="px-5 py-3">
                            <Badge variant={calibracionVariant}>{calibracionTexto}</Badge>
                          </td>
                          <td className="px-5 py-3">
                            <Badge variant={d.conexionPosible ? "success" : "neutral"}>
                              {d.conexionPosible ? "Conexión directa posible" : "Carga manual"}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setDispositivoDetalle(d)}
                                aria-label={`Ver ${d.nombre}`}
                                className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                              >
                                <Search className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => abrirEdicion(d)}
                                aria-label={`Editar ${d.nombre}`}
                                className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <DispositivoFormModal
        isOpen={isFormOpen}
        dispositivo={dispositivoEnEdicion}
        numerosSerieExistentes={numerosSerieExistentes}
        onClose={() => setIsFormOpen(false)}
        onGuardar={handleGuardar}
      />

      <DispositivoDetalleModal
        isOpen={dispositivoDetalle !== null}
        dispositivo={dispositivoDetalle}
        onClose={() => setDispositivoDetalle(null)}
      />
    </Layout>
  );
}
