import { useEffect, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Modal } from "../../../components/ui/Modal";
import { Badge } from "../../../components/ui/Badge";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import { useConsumosLote } from "../../../hooks/useConsumosLote";
import { useLotesProduccion } from "../../../hooks/useLotesProduccion";
import { useRegistrarConsumo } from "../../../hooks/useRegistrarConsumo";
import { useConfigParametros } from "../../../hooks/useConfigParametros";
import {
  ORDEN_PARAMETROS,
  PARAMETROS_META,
  type ParametroVisible,
} from "../../Configuracion/constants/parametrosCalidad";
import type { ConfigParametro, TipoMateriaPrima } from "../../../types/configParametro.types";
import { EstadoLote, type Lote } from "../../../types/lote.types";

// Mismo criterio que LoteFormModal.buscarConfig: el rango esperado depende
// de la configuración de umbrales de la empresa (HU-09), no de un rango
// físico estático. GET /config-parametros es exclusivo de Gerente en el
// backend, así que para el resto de los roles esto queda vacío y se muestra
// "—" (no es un bug, es la misma limitación ya aceptada en LoteFormModal).
function buscarConfig(
  configs: ConfigParametro[],
  parametro: ParametroVisible,
  materiaPrima: TipoMateriaPrima,
): ConfigParametro | undefined {
  return configs.find((c) => c.parametro === parametro && c.tipoMateriaPrima === materiaPrima);
}

function buildParametrosVacios(): Record<ParametroVisible, string> {
  return ORDEN_PARAMETROS.reduce(
    (acc, parametro) => ({ ...acc, [parametro]: "" }),
    {} as Record<ParametroVisible, string>,
  );
}

interface TrazabilidadLoteModalProps {
  isOpen: boolean;
  lote: Lote | null;
  proveedorMap: Map<number, string>;
  // HU-36: mismo patrón que proveedorMap — resuelve lote.tamboId -> nombre
  // (GET /tambos, armado en LotesPage).
  tamboMap: Map<number, string>;
  // Roles Responsable de calidad / Responsable de producción (POST
  // /lotes/:id/consumos en el backend). Gerente/Administrador ven el panel
  // en modo solo lectura (tienen acceso a GET /lotes/:id/consumos pero no al
  // POST).
  puedeRegistrarConsumo: boolean;
  onClose: () => void;
  // Se dispara tras registrar un consumo con éxito: LotesPage hace
  // refetch() de useLotes() para que este mismo lote (buscado de nuevo por
  // id en la lista) llegue con cantidadDisponible actualizado. No se pide
  // GET /lotes/:id porque ese endpoint no incluye a Responsable de
  // Producción entre sus roles habilitados (a diferencia de GET /lotes).
  onConsumoRegistrado: () => void;
}

export function TrazabilidadLoteModal({
  isOpen,
  lote,
  proveedorMap,
  tamboMap,
  puedeRegistrarConsumo,
  onClose,
  onConsumoRegistrado,
}: TrazabilidadLoteModalProps) {
  const loteId = lote?.id ?? null;
  const { consumos, isLoading: isLoadingConsumos, error: errorConsumos, refetch: refetchConsumos } =
    useConsumosLote(loteId);
  const { lotesProduccion } = useLotesProduccion();
  const { configs } = useConfigParametros();
  const { registrar, isSubmitting, error: errorRegistro, resetError } = useRegistrarConsumo();

  const [cantidad, setCantidad] = useState("");
  const [loteProduccionId, setLoteProduccionId] = useState("");
  const [parametros, setParametros] = useState<Record<ParametroVisible, string>>(
    buildParametrosVacios(),
  );
  const [errorCantidad, setErrorCantidad] = useState("");
  const [errorParametros, setErrorParametros] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setCantidad("");
    setLoteProduccionId("");
    setParametros(buildParametrosVacios());
    setErrorCantidad("");
    setErrorParametros("");
    resetError();
  }, [isOpen, loteId, resetError]);

  if (!isOpen || !lote) return null;

  const cantidadTotal = lote.cantidad ?? null;
  const disponible = lote.cantidadDisponible ?? 0;
  const consumido = cantidadTotal !== null ? Math.max(cantidadTotal - disponible, 0) : 0;
  const porcentajeConsumido =
    cantidadTotal && cantidadTotal > 0 ? Math.min((consumido / cantidadTotal) * 100, 100) : 0;

  // AC3: no hay flag del backend — se infiere igual que lote-consumo.service.ts
  // (cantidadConsumosPrevios === 0). Mientras el historial está cargando no se
  // sabe todavía, así que el formulario de parámetros queda oculto para no
  // mostrar el requisito equivocado por un instante.
  const esPrimerConsumo = !isLoadingConsumos && consumos.length === 0;

  const loteAdmiteConsumo =
    cantidadTotal !== null &&
    lote.estado !== EstadoLote.FINALIZADO &&
    lote.estado !== EstadoLote.RECHAZADO;

  const loteProduccionOptions = [
    { value: "", label: "Crear uno nuevo automáticamente" },
    ...lotesProduccion.map((lp) => ({ value: String(lp.id), label: lp.codigo })),
  ];

  const setParametro = (parametro: ParametroVisible, valor: string) => {
    setParametros((prev) => ({ ...prev, [parametro]: valor }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorCantidad("");
    setErrorParametros("");
    resetError();

    const cantidadNum = Number(cantidad);
    if (cantidad.trim() === "" || Number.isNaN(cantidadNum) || cantidadNum <= 0) {
      setErrorCantidad("Ingresá una cantidad numérica mayor a 0");
      return;
    }
    if (cantidadNum > disponible) {
      setErrorCantidad(`No podés consumir más del saldo disponible (${disponible} L)`);
      return;
    }

    const parametrosCargados = ORDEN_PARAMETROS.filter(
      (parametro) => parametros[parametro].trim() !== "",
    );
    if (!esPrimerConsumo && parametrosCargados.length === 0) {
      setErrorParametros(
        "Este remanente ya tuvo un consumo previo: cargá al menos un parámetro de calidad del nuevo análisis",
      );
      return;
    }
    for (const parametro of parametrosCargados) {
      if (Number.isNaN(Number(parametros[parametro]))) {
        setErrorParametros(`El valor de ${PARAMETROS_META[parametro].label} debe ser numérico`);
        return;
      }
    }

    try {
      await registrar(lote.id, {
        cantidad: cantidadNum,
        loteProduccionId: loteProduccionId ? Number(loteProduccionId) : undefined,
        parametros:
          parametrosCargados.length > 0
            ? parametrosCargados.map((parametro) => ({
                parametro,
                valor: Number(parametros[parametro]),
              }))
            : undefined,
      });
      setCantidad("");
      setLoteProduccionId("");
      setParametros(buildParametrosVacios());
      await refetchConsumos();
      onConsumoRegistrado();
    } catch {
      // el mensaje ya queda en errorRegistro (useRegistrarConsumo)
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title="Detalle de trazabilidad de lote"
      description={lote.codigo}
      onClose={onClose}
    >
      <div className="flex flex-col gap-8">
        {/* Datos de ingreso */}
        <div className="flex flex-col gap-3">
          <SectionHeader>DATOS DE INGRESO</SectionHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Proveedor</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {proveedorMap.get(lote.proveedorId) ?? `Proveedor #${lote.proveedorId}`}
              </p>
            </div>
            <div className="flex flex-col gap-1 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Tambo de origen
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {tamboMap.get(lote.tamboId) ?? `Tambo #${lote.tamboId}`}
              </p>
            </div>
            <div className="flex flex-col gap-1 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Cantidad ingresada
              </p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {cantidadTotal !== null ? `${cantidadTotal} L` : "No registrada"}
              </p>
            </div>
          </div>
        </div>

        {/* Parámetros de calidad al ingreso */}
        <div className="flex flex-col gap-3">
          <SectionHeader>PARÁMETROS DE CALIDAD AL INGRESO</SectionHeader>
          {lote.parametros.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Este lote no tiene parámetros cargados al ingreso.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {lote.parametros.map((p) => {
                const meta = PARAMETROS_META[p.parametro as ParametroVisible];
                const config = buscarConfig(
                  configs,
                  p.parametro as ParametroVisible,
                  lote.materiaPrima,
                );
                return (
                  <div
                    key={p.parametro}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800"
                  >
                    <span className="w-32 flex-shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">
                      {meta?.label ?? p.parametro}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {p.valor} {meta?.unidad}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {config ? `${config.umbralMin} – ${config.umbralMax}` : "—"}
                    </span>
                    <Badge variant="neutral">Sin sensor</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Saldo del lote */}
        <div className="flex flex-col gap-3">
          <SectionHeader>SALDO DEL LOTE</SectionHeader>
          {cantidadTotal === null ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Este lote no tiene una cantidad total ingresada registrada: no admite consumo
              parcial.
            </p>
          ) : (
            <>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-[#3d6fcf] transition-all"
                  style={{ width: `${porcentajeConsumido}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  Consumido: <span className="font-semibold text-slate-900 dark:text-white">{consumido} L</span>
                </span>
                <span className="text-slate-600 dark:text-slate-400">
                  Disponible:{" "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {disponible} L
                  </span>
                </span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                sobre {cantidadTotal} L ingresados
              </p>
            </>
          )}
        </div>

        {/* Consumos parciales asociados */}
        <div className="flex flex-col gap-3">
          <SectionHeader>CONSUMOS PARCIALES ASOCIADOS</SectionHeader>
          {errorConsumos && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
              {errorConsumos}
            </p>
          )}
          {isLoadingConsumos ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Cargando consumos...</p>
          ) : consumos.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Todavía no se registraron consumos parciales de este lote.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="px-3 py-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                      Fecha
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                      Cantidad
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                      Lote de producción
                    </th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                      Análisis
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {consumos.map((consumo) => (
                    <tr key={consumo.id}>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400">
                        {new Date(consumo.createdAt).toLocaleString("es-AR")}
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                        {consumo.cantidad} L
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {consumo.loteProduccionCodigo}
                      </td>
                      <td className="px-3 py-2">
                        {consumo.parametros.length > 0 ? (
                          <Badge variant="info">Nuevo análisis registrado</Badge>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            Del ingreso original
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Registrar consumo */}
        {puedeRegistrarConsumo && (
          <div className="flex flex-col gap-3">
            <SectionHeader>REGISTRAR CONSUMO</SectionHeader>
            {!loteAdmiteConsumo ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {cantidadTotal === null
                  ? "Este lote no admite consumo parcial (sin cantidad ingresada registrada)."
                  : "Este lote ya no admite nuevos consumos (estado finalizado o rechazado)."}
              </p>
            ) : disponible <= 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No queda saldo disponible en este lote.
              </p>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    id="consumo-cantidad"
                    type="number"
                    inputMode="decimal"
                    label={`Cantidad (L) — máx. ${disponible}`}
                    placeholder={`hasta ${disponible}`}
                    value={cantidad}
                    max={disponible}
                    onChange={(e) => setCantidad(e.target.value)}
                    error={errorCantidad}
                  />
                  <Select
                    id="consumo-lote-produccion"
                    label="Lote de producción destino"
                    options={loteProduccionOptions}
                    value={loteProduccionId}
                    onChange={(e) => setLoteProduccionId(e.target.value)}
                  />
                </div>

                {!esPrimerConsumo && (
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Este remanente ya tuvo un consumo previo — se requiere un nuevo registro de
                      parámetros de calidad (cargá al menos uno).
                    </p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {ORDEN_PARAMETROS.map((parametro) => {
                        const meta = PARAMETROS_META[parametro];
                        const config = buscarConfig(configs, parametro, lote.materiaPrima);
                        return (
                          <Input
                            key={parametro}
                            id={`consumo-param-${parametro}`}
                            label={`${meta.label} (${meta.unidad})`}
                            type="number"
                            inputMode="decimal"
                            placeholder={config ? `${config.umbralMin} a ${config.umbralMax}` : ""}
                            value={parametros[parametro]}
                            onChange={(e) => setParametro(parametro, e.target.value)}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {errorParametros && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errorParametros}</p>
                )}
                {errorRegistro && (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
                    {errorRegistro}
                  </p>
                )}

                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  className="!w-auto items-center gap-1.5 self-end px-6"
                >
                  <Check className="h-4 w-4" />
                  Registrar consumo
                </Button>
              </form>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
