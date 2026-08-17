import { useEffect, useState, type FormEvent } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { RadioCard } from "../../components/ui/RadioCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { extraerMensajeError } from "../../services/lote.service";
import { sensorService, extraerMensajeError as extraerMensajeErrorSensor } from "../../services/sensor.service";
import { useConfigParametros } from "../../hooks/useConfigParametros";
import {
  ORDEN_PARAMETROS,
  PARAMETROS_META,
  TIPO_MATERIA_PRIMA_TABS,
  type ParametroVisible,
} from "../Configuracion/constants/parametrosCalidad";
import { UBICACION_LABEL } from "../Sensores/constants/parametroSensor";
import { TipoMateriaPrima } from "../../types/configParametro.types";
import type { ConfigParametro } from "../../types/configParametro.types";
import { Ubicacion, type Sensor } from "../../types/sensor.types";
import {
  DestinoLote,
  type CreateLoteDto,
  type Lote,
  type LoteCreateResponse,
  type LoteParametro,
  type UpdateLoteDto,
} from "../../types/lote.types";
import type { Proveedor } from "../../types/proveedor.types";

const UBICACION_OPTIONS = [
  { value: "", label: "Sin definir" },
  ...Object.values(Ubicacion).map((u) => ({ value: u, label: UBICACION_LABEL[u] })),
];

const DESTINO_OPTIONS = [
  { value: "", label: "Seleccioná un destino" },
  { value: DestinoLote.PRODUCCION, label: "Producción" },
  { value: DestinoLote.ALMACENAMIENTO, label: "Almacenamiento" },
  { value: DestinoLote.TRATAMIENTO, label: "Tratamiento" },
  { value: DestinoLote.DESCARTE, label: "Descarte" },
];

interface FormValues {
  proveedorId: string;
  materiaPrima: TipoMateriaPrima;
  fechaIngreso: string;
  cantidad: string;
  parametros: Record<ParametroVisible, string>;
  destinoInicial: DestinoLote | "";
  ubicacionInicial: Ubicacion | "";
  // HU-66: datos del remito, opcionales (AC4) — el lote se guarda igual sin
  // ellos.
  cantidadComprometida: string;
  parametrosComprometidos: Record<ParametroVisible, string>;
}

interface FormErrors {
  proveedorId?: string;
  fechaIngreso?: string;
  cantidad?: string;
  destinoInicial?: string;
  parametros?: Partial<Record<ParametroVisible, string>>;
  parametrosGeneral?: string;
  cantidadComprometida?: string;
  parametrosComprometidos?: Partial<Record<ParametroVisible, string>>;
}

function buildParametrosVacios(): Record<ParametroVisible, string> {
  return ORDEN_PARAMETROS.reduce(
    (acc, parametro) => ({ ...acc, [parametro]: "" }),
    {} as Record<ParametroVisible, string>,
  );
}

function buildInitialValues(lote?: Lote): FormValues {
  if (!lote) {
    return {
      proveedorId: "",
      materiaPrima: TipoMateriaPrima.LECHE_CRUDA,
      fechaIngreso: new Date().toISOString().slice(0, 10),
      cantidad: "",
      parametros: buildParametrosVacios(),
      destinoInicial: "",
      ubicacionInicial: "",
      cantidadComprometida: "",
      parametrosComprometidos: buildParametrosVacios(),
    };
  }
  return {
    proveedorId: String(lote.proveedorId),
    materiaPrima: lote.materiaPrima,
    fechaIngreso: lote.fechaIngreso.slice(0, 10),
    // No editable en PATCH /lotes/:id (ver UpdateLoteDto): en edición se
    // muestra de solo lectura más abajo, no hace falta en el form value.
    cantidad: lote.cantidad != null ? String(lote.cantidad) : "",
    parametros: buildParametrosVacios(),
    destinoInicial: lote.destinoInicial ?? "",
    ubicacionInicial: lote.ubicacionInicial ?? "",
    // HU-66: tampoco editable en PATCH /lotes/:id.
    cantidadComprometida: "",
    parametrosComprometidos: buildParametrosVacios(),
  };
}

// El rango permitido por parámetro depende de la configuración de umbrales
// de la empresa para esa combinación parametro + materiaPrima (HU-09), no
// de un rango físico estático: es lo mismo que valida el backend al crear.
function buscarConfig(
  configs: ConfigParametro[],
  parametro: ParametroVisible,
  materiaPrima: TipoMateriaPrima,
): ConfigParametro | undefined {
  return configs.find((c) => c.parametro === parametro && c.tipoMateriaPrima === materiaPrima);
}

function validate(values: FormValues, configs: ConfigParametro[], esEdicion: boolean): FormErrors {
  const errors: FormErrors = {};

  if (!values.proveedorId) errors.proveedorId = "El proveedor es obligatorio";
  if (!values.fechaIngreso) errors.fechaIngreso = "La fecha de ingreso es obligatoria";
  if (!values.destinoInicial) errors.destinoInicial = "El destino inicial es obligatorio";

  // PATCH /lotes/:id no acepta cantidad ni parametros (ver UpdateLoteDto /
  // LoteService.update en el backend): en edición no hay nada más que
  // validar acá.
  if (esEdicion) return errors;

  // HU-68: obligatoria en el backend (CreateLoteDto.cantidad, @IsPositive) —
  // habilita el consumo parcial posterior de este lote.
  if (values.cantidad.trim() === "") {
    errors.cantidad = "La cantidad ingresada es obligatoria";
  } else if (Number.isNaN(Number(values.cantidad)) || Number(values.cantidad) <= 0) {
    errors.cantidad = "Debe ser un número mayor a 0";
  }

  // Los parámetros son opcionales campo por campo, pero el backend exige al
  // menos uno (@ArrayMinSize(1) en CreateLoteDto): solo se valida formato y
  // rango de los que sí tengan un valor cargado.
  const parametrosErrors: Partial<Record<ParametroVisible, string>> = {};
  let algunoCargado = false;
  for (const parametro of ORDEN_PARAMETROS) {
    const raw = values.parametros[parametro];

    if (raw.trim() === "") continue;
    algunoCargado = true;

    const valor = Number(raw);
    if (Number.isNaN(valor)) {
      parametrosErrors[parametro] = "Debe ser numérico";
      continue;
    }

    // El rol Responsable de calidad no tiene acceso de lectura a GET
    // /config-parametros (solo Gerente, ver config-parametro.controller.ts),
    // así que "configs" puede llegar vacío aunque los umbrales sí existan.
    // Cuando no hay match no bloqueamos en el cliente: el backend vuelve a
    // validar el rango real en el POST /lotes y devuelve el error ahí.
    const config = buscarConfig(configs, parametro, values.materiaPrima);
    if (config && (valor < config.umbralMin || valor > config.umbralMax)) {
      parametrosErrors[parametro] = `Debe estar entre ${config.umbralMin} y ${config.umbralMax}`;
    }
  }
  if (Object.keys(parametrosErrors).length > 0) errors.parametros = parametrosErrors;
  if (!algunoCargado) errors.parametrosGeneral = "Cargá al menos un parámetro de calidad";

  // HU-66: datos del remito, opcionales (AC4) — solo se valida formato de
  // lo que sí se cargó.
  if (values.cantidadComprometida.trim() !== "") {
    const valor = Number(values.cantidadComprometida);
    if (Number.isNaN(valor) || valor <= 0) {
      errors.cantidadComprometida = "Debe ser un número mayor a 0";
    }
  }

  const comprometidosErrors: Partial<Record<ParametroVisible, string>> = {};
  for (const parametro of ORDEN_PARAMETROS) {
    const raw = values.parametrosComprometidos[parametro];
    if (raw.trim() === "") continue;

    const valor = Number(raw);
    if (Number.isNaN(valor)) {
      comprometidosErrors[parametro] = "Debe ser numérico";
      continue;
    }
    // El backend arma cada item de parametros[] como { parametro, valor,
    // valorComprometido? }: sin un valor real cargado para ese parámetro no
    // hay item donde mandar el comprometido (se perdería el dato). La UI ya
    // deshabilita el input en ese caso, pero se valida igual por las dudas.
    if (values.parametros[parametro].trim() === "") {
      comprometidosErrors[parametro] = "Cargá primero el valor real medido de este parámetro";
    }
  }
  if (Object.keys(comprometidosErrors).length > 0) {
    errors.parametrosComprometidos = comprometidosErrors;
  }

  return errors;
}

interface LoteFormModalProps {
  isOpen: boolean;
  proveedores: Proveedor[];
  lote?: Lote; // presente = modo edición
  isSubmitting: boolean;
  onClose: () => void;
  onCreate: (dto: CreateLoteDto) => Promise<LoteCreateResponse>;
  onUpdate: (id: number, dto: UpdateLoteDto) => Promise<Lote>;
}

type Paso = "form" | "asociar" | "warnings";

export function LoteFormModal({
  isOpen,
  proveedores,
  lote,
  isSubmitting,
  onClose,
  onCreate,
  onUpdate,
}: LoteFormModalProps) {
  const esEdicion = !!lote;
  const { configs } = useConfigParametros();
  const [values, setValues] = useState<FormValues>(() => buildInitialValues(lote));
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");

  // Tras crear el lote, si el backend sugiere sensoresDisponibles (activos
  // en la misma ubicacionInicial), se ofrece asociarlos sin salir del modal
  // en vez de pedirlos aparte.
  const [paso, setPaso] = useState<Paso>("form");
  const [loteCreadoId, setLoteCreadoId] = useState<number | null>(null);
  const [sensoresDisponibles, setSensoresDisponibles] = useState<Sensor[]>([]);
  const [sensoresSeleccionados, setSensoresSeleccionados] = useState<Set<number>>(new Set());
  const [isAsociando, setIsAsociando] = useState(false);
  const [asociarError, setAsociarError] = useState("");

  // Advertencias no bloqueantes de POST /lotes (ej. parámetro fuera de rango
  // o sin config de umbral): el lote se guarda igual, pero no queremos que
  // se pierdan silenciosamente cerrando el modal solo.
  const [warnings, setWarnings] = useState<string[]>([]);

  // HU-66: colapsada por defecto — es común no tener el remito al momento
  // de la carga (AC4), no queremos que el form se vea más largo/obligatorio
  // de lo que es cuando no aplica.
  const [remitoAbierto, setRemitoAbierto] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setValues(buildInitialValues(lote));
    setErrors({});
    setServerError("");
    setPaso("form");
    setLoteCreadoId(null);
    setSensoresDisponibles([]);
    setSensoresSeleccionados(new Set());
    setAsociarError("");
    setWarnings([]);
    setRemitoAbierto(false);
  }, [isOpen, lote]);

  if (!isOpen) return null;

  const proveedorOptions = [
    { value: "", label: "Seleccioná un proveedor" },
    ...proveedores.map((p) => ({ value: String(p.id), label: `${p.razonSocial} (${p.cuit})` })),
  ];

  const setParametro = (parametro: ParametroVisible, valor: string) => {
    setValues((prev) => {
      // HU-66: si se borra el valor real, se limpia también el
      // comprometido de ese parámetro — sin valor real ese item ni siquiera
      // se manda en parametros[], el comprometido se perdería silenciosamente.
      const limpiarComprometido = valor.trim() === "";
      return {
        ...prev,
        parametros: { ...prev.parametros, [parametro]: valor },
        parametrosComprometidos: limpiarComprometido
          ? { ...prev.parametrosComprometidos, [parametro]: "" }
          : prev.parametrosComprometidos,
      };
    });
  };

  const setParametroComprometido = (parametro: ParametroVisible, valor: string) => {
    setValues((prev) => ({
      ...prev,
      parametrosComprometidos: { ...prev.parametrosComprometidos, [parametro]: valor },
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError("");
    const validationErrors = validate(values, configs, esEdicion);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    if (esEdicion) {
      try {
        // PATCH /lotes/:id solo aplica estos 4 campos (ver UpdateLoteDto):
        // no se puede editar proveedor, ubicacionInicial ni parametros.
        await onUpdate(lote!.id, {
          materiaPrima: values.materiaPrima,
          fechaIngreso: new Date(`${values.fechaIngreso}T12:00:00`).toISOString(),
          destinoInicial: values.destinoInicial as DestinoLote,
        });
        onClose();
      } catch (err) {
        setServerError(extraerMensajeError(err, "No se pudo actualizar el lote. Intentá nuevamente."));
      }
      return;
    }

    const parametros: LoteParametro[] = ORDEN_PARAMETROS.filter(
      (parametro) => values.parametros[parametro].trim() !== "",
    ).map((parametro) => {
      const comprometido = values.parametrosComprometidos[parametro].trim();
      return {
        parametro,
        valor: Number(values.parametros[parametro]),
        // HU-66: opcional (AC4) — solo viaja si se cargó el valor comprometido.
        ...(comprometido !== "" ? { valorComprometido: Number(comprometido) } : {}),
      };
    });

    try {
      const respuesta = await onCreate({
        proveedorId: Number(values.proveedorId),
        materiaPrima: values.materiaPrima,
        fechaIngreso: new Date(`${values.fechaIngreso}T12:00:00`).toISOString(),
        destinoInicial: values.destinoInicial as DestinoLote,
        ubicacionInicial: values.ubicacionInicial || undefined,
        parametros,
        cantidad: Number(values.cantidad),
        // HU-66: opcional (AC4) — solo viaja si se cargó la cantidad comprometida.
        ...(values.cantidadComprometida.trim() !== ""
          ? { cantidadComprometidaKg: Number(values.cantidadComprometida) }
          : {}),
      });

      setWarnings(respuesta.warnings ?? []);

      if (respuesta.sensoresDisponibles.length > 0) {
        setLoteCreadoId(respuesta.lote.id);
        setSensoresDisponibles(respuesta.sensoresDisponibles);
        setPaso("asociar");
      } else if ((respuesta.warnings ?? []).length > 0) {
        setPaso("warnings");
      } else {
        onClose();
      }
    } catch (err) {
      setServerError(extraerMensajeError(err, "No se pudo registrar el lote. Intentá nuevamente."));
    }
  };

  const toggleSensor = (id: number) => {
    setSensoresSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAsociarSeleccionados = async () => {
    if (loteCreadoId === null) return;
    if (sensoresSeleccionados.size === 0) {
      onClose();
      return;
    }
    setAsociarError("");
    setIsAsociando(true);
    try {
      await sensorService.asociarALote(loteCreadoId, [...sensoresSeleccionados]);
      onClose();
    } catch (err) {
      setAsociarError(
        extraerMensajeErrorSensor(err, "No se pudieron asociar los sensores seleccionados."),
      );
    } finally {
      setIsAsociando(false);
    }
  };

  if (paso === "warnings") {
    return (
      <Modal
        isOpen={isOpen}
        title="Lote registrado"
        description="El lote se guardó correctamente, pero hay advertencias para revisar"
        onClose={onClose}
        footer={
          <div className="flex justify-end">
            <Button type="button" className="!w-auto px-6" onClick={onClose}>
              Entendido, cerrar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          {warnings.map((w, i) => (
            <div
              key={i}
              className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
            >
              {w}
            </div>
          ))}
        </div>
      </Modal>
    );
  }

  if (paso === "asociar") {
    return (
      <Modal
        isOpen={isOpen}
        title="Asociar sensores al lote"
        description="Sensores activos disponibles en la ubicación inicial del lote recién creado"
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Omitir
            </button>
            <Button
              type="button"
              isLoading={isAsociando}
              className="!w-auto px-6"
              onClick={handleAsociarSeleccionados}
            >
              Asociar seleccionados
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          {warnings.map((w, i) => (
            <div
              key={i}
              className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
            >
              {w}
            </div>
          ))}
          {sensoresDisponibles.map((sensor) => (
            <label
              key={sensor.id}
              className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
            >
              <input
                type="checkbox"
                checked={sensoresSeleccionados.has(sensor.id)}
                onChange={() => toggleSensor(sensor.id)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700"
              />
              <span className="text-slate-700 dark:text-slate-300">
                {sensor.nombre}{" "}
                <span className="text-slate-400 dark:text-slate-500">
                  ({UBICACION_LABEL[sensor.ubicacion]})
                </span>
              </span>
            </label>
          ))}
          {asociarError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
              {asociarError}
            </p>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      title={esEdicion ? "Editar lote" : "Nuevo lote"}
      description={
        esEdicion
          ? `Actualizá los datos editables del lote ${lote!.codigo}`
          : "Registrá el lote recibido con toda la información requerida"
      }
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <Button type="submit" form="lote-form" isLoading={isSubmitting} className="!w-auto px-6">
            {esEdicion ? "Guardar cambios" : "Registrar lote"}
          </Button>
        </div>
      }
    >
      <form id="lote-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        {/* Datos del lote */}
        <div className="flex flex-col gap-3">
          <SectionHeader>DATOS DEL LOTE</SectionHeader>
          <Select
            id="lote-proveedor"
            label="Proveedor *"
            options={proveedorOptions}
            value={values.proveedorId}
            disabled={esEdicion}
            onChange={(e) => setValues((prev) => ({ ...prev, proveedorId: e.target.value }))}
            error={errors.proveedorId}
          />
          {esEdicion && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              El proveedor no se puede modificar una vez creado el lote.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Tipo de materia prima *
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {TIPO_MATERIA_PRIMA_TABS.map((tab) => (
                <RadioCard
                  key={tab.value}
                  name="materiaPrima"
                  value={tab.value}
                  label={tab.label}
                  checked={values.materiaPrima === tab.value}
                  onChange={(value) =>
                    setValues((prev) => ({ ...prev, materiaPrima: value as TipoMateriaPrima }))
                  }
                />
              ))}
            </div>
          </div>

          <Input
            id="lote-fechaIngreso"
            type="date"
            label="Fecha de ingreso *"
            value={values.fechaIngreso}
            onChange={(e) => setValues((prev) => ({ ...prev, fechaIngreso: e.target.value }))}
            error={errors.fechaIngreso}
          />

          {/* HU-68: cantidad total ingresada, habilita el consumo parcial
              posterior. No editable en PATCH /lotes/:id (ver UpdateLoteDto). */}
          {esEdicion ? (
            <div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Cantidad ingresada
              </span>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {lote!.cantidad != null ? `${lote!.cantidad} L` : "No registrada"}
              </p>
            </div>
          ) : (
            <Input
              id="lote-cantidad"
              type="number"
              inputMode="decimal"
              label="Cantidad ingresada (L) *"
              value={values.cantidad}
              onChange={(e) => setValues((prev) => ({ ...prev, cantidad: e.target.value }))}
              error={errors.cantidad}
            />
          )}
        </div>

        {/* Parámetros de calidad: PATCH /lotes/:id no los acepta (ver
            UpdateLoteDto), así que en edición se muestran de solo lectura. */}
        <div className="flex flex-col gap-3">
          <SectionHeader>
            {esEdicion ? "PARÁMETROS DE CALIDAD" : "PARÁMETROS DE CALIDAD (opcional, al menos uno)"}
          </SectionHeader>
          {esEdicion ? (
            lote!.parametros.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {lote!.parametros.map((p) => (
                  <div
                    key={p.parametro}
                    className="rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800"
                  >
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {PARAMETROS_META[p.parametro as ParametroVisible]?.label ?? p.parametro}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{p.valor}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Este lote no tiene parámetros cargados.
              </p>
            )
          ) : (
            <>
              {errors.parametrosGeneral && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.parametrosGeneral}</p>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {ORDEN_PARAMETROS.map((parametro) => {
                  const meta = PARAMETROS_META[parametro];
                  const config = buscarConfig(configs, parametro, values.materiaPrima);
                  return (
                    <Input
                      key={parametro}
                      id={`lote-param-${parametro}`}
                      label={`${meta.label} (${meta.unidad})`}
                      type="number"
                      inputMode="decimal"
                      placeholder={config ? `${config.umbralMin} a ${config.umbralMax}` : ""}
                      value={values.parametros[parametro]}
                      onChange={(e) => setParametro(parametro, e.target.value)}
                      error={errors.parametros?.[parametro]}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* HU-66: datos del remito, opcionales (AC4) — colapsado por
            defecto porque no siempre se cuenta con el remito al momento de
            la carga. PATCH /lotes/:id tampoco acepta estos campos, así que
            en edición no se muestra la sección. */}
        {!esEdicion && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setRemitoAbierto((prev) => !prev)}
              className="flex w-full items-center gap-3"
            >
              {remitoAbierto ? (
                <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400 dark:text-slate-500" />
              ) : (
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400 dark:text-slate-500" />
              )}
              <span className="text-xs font-semibold tracking-wide text-slate-400 dark:text-slate-500">
                DATOS DEL REMITO (OPCIONAL)
              </span>
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </button>

            {remitoAbierto && (
              <div className="flex flex-col gap-3 border-l-2 border-slate-100 pl-4 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cargá lo comprometido por el proveedor según el remito para detectar desvíos
                  contra lo efectivamente recibido. Si no contás con el remito todavía, podés
                  dejar esta sección vacía y el lote se guarda igual.
                </p>

                <Input
                  id="lote-cantidadComprometida"
                  type="number"
                  inputMode="decimal"
                  label="Cantidad comprometida según remito"
                  value={values.cantidadComprometida}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, cantidadComprometida: e.target.value }))
                  }
                  error={errors.cantidadComprometida}
                />

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {ORDEN_PARAMETROS.map((parametro) => {
                    const meta = PARAMETROS_META[parametro];
                    const tieneValorReal = values.parametros[parametro].trim() !== "";
                    return (
                      <Input
                        key={`comprometido-${parametro}`}
                        id={`lote-param-comprometido-${parametro}`}
                        label={`${meta.label} comprometido (${meta.unidad})`}
                        type="number"
                        inputMode="decimal"
                        disabled={!tieneValorReal}
                        placeholder={tieneValorReal ? "" : "Cargá primero el valor real"}
                        value={values.parametrosComprometidos[parametro]}
                        onChange={(e) => setParametroComprometido(parametro, e.target.value)}
                        error={errors.parametrosComprometidos?.[parametro]}
                        className={!tieneValorReal ? "opacity-60" : ""}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Destino */}
        <div className="flex flex-col gap-3">
          <SectionHeader>DESTINO</SectionHeader>
          <Select
            id="lote-destino"
            label="Destino inicial *"
            options={DESTINO_OPTIONS}
            value={values.destinoInicial}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, destinoInicial: e.target.value as DestinoLote }))
            }
            error={errors.destinoInicial}
          />
          <Select
            id="lote-ubicacionInicial"
            label="Ubicación inicial (opcional)"
            options={UBICACION_OPTIONS}
            value={values.ubicacionInicial}
            disabled={esEdicion}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, ubicacionInicial: e.target.value as Ubicacion }))
            }
          />
          {esEdicion && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              La ubicación inicial no se puede modificar una vez creado el lote.
            </p>
          )}
        </div>

        {serverError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
            {serverError}
          </p>
        )}
      </form>
    </Modal>
  );
}
