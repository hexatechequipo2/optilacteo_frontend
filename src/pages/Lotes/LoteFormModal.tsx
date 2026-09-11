import { useEffect, useRef, useState, type FormEvent } from "react";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { RadioCard } from "../../components/ui/RadioCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { extraerMensajeError, loteService } from "../../services/lote.service";
import {
  sensorService,
  extraerMensajeError as extraerMensajeErrorSensor,
} from "../../services/sensor.service";
import { useConfigParametros } from "../../hooks/useConfigParametros";
import { useTambosPorProveedor } from "../../hooks/useTambos";
import { RecomendacionDestinoCard } from "./components/RecomendacionDestinoCard";
import { useCatalogoDestinosProductivos } from "../../hooks/useCatalogoDestinosProductivos";
import { useDestinoProductivoLote } from "../../hooks/useDestinoProductivoLote";
import { registrarRemitoLote } from "../../hooks/useRemitoLote";
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
  EstadoLote,
  type CreateLoteDto,
  type Lote,
  type LoteCreateResponse,
  type LoteParametro,
  type UpdateLoteDto,
} from "../../types/lote.types";
import type { Proveedor } from "../../types/proveedor.types";

const UBICACION_OPTIONS = [
  { value: "", label: "Sin definir" },
  ...Object.values(Ubicacion).map((u) => ({
    value: u,
    label: UBICACION_LABEL[u],
  })),
];

const DESTINO_LABEL: Record<DestinoLote, string> = {
  [DestinoLote.PRODUCCION]: "Producción",
  [DestinoLote.ALMACENAMIENTO]: "Almacenamiento",
  [DestinoLote.TRATAMIENTO]: "Tratamiento",
  [DestinoLote.DESCARTE]: "Descarte",
};

const DESTINO_OPTIONS = [
  { value: "", label: "Seleccioná un destino" },
  ...Object.values(DestinoLote).map((destino) => ({
    value: destino,
    label: DESTINO_LABEL[destino],
  })),
];

// HU-69 (AC3, Pantalla 9): "formato alfanumérico válido" — letras, números y
// guiones, mismo ejemplo del prototipo ("R-000123"). Sin espacios ni otros
// símbolos.
const NUMERO_REMITO_REGEX = /^[A-Za-z0-9-]+$/;

interface FormValues {
  proveedorId: string;
  // HU-36: tambo de origen, obligatorio y dependiente del proveedor elegido
  // (combo encadenado, ver useTambosPorProveedor).
  tamboId: string;
  materiaPrima: TipoMateriaPrima;
  fechaIngreso: string;
  cantidad: string;
  parametros: Record<ParametroVisible, string>;
  destinoInicial: DestinoLote | "";
  ubicacionInicial: Ubicacion | "";
  // HU-69 (AC1): obligatorio, a diferencia del resto de "datos del remito".
  numeroRemito: string;
  // HU-66: cantidad/calidad comprometidas, opcionales (AC4) — el lote se
  // guarda igual sin ellas.
  cantidadComprometida: string;
  parametrosComprometidos: Record<ParametroVisible, string>;
  // HU-34 (mock visual): destino productivo del catálogo configurable
  // (queso, yogur, crema, etc.) — no confundir con `destinoInicial`, el
  // enum fijo de arriba. Opcional acá, obligatorio recién para poder
  // cerrar el ciclo del lote (ver botón "Cerrar ciclo del lote").
  destinoProductivoId: number | "";
}

interface FormErrors {
  proveedorId?: string;
  tamboId?: string;
  fechaIngreso?: string;
  cantidad?: string;
  destinoInicial?: string;
  parametros?: Partial<Record<ParametroVisible, string>>;
  parametrosGeneral?: string;
  numeroRemito?: string;
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
      tamboId: "",
      materiaPrima: TipoMateriaPrima.LECHE_CRUDA,
      fechaIngreso: new Date().toISOString().slice(0, 10),
      cantidad: "",
      parametros: buildParametrosVacios(),
      destinoInicial: "",
      ubicacionInicial: "",
      numeroRemito: "",
      cantidadComprometida: "",
      parametrosComprometidos: buildParametrosVacios(),
      destinoProductivoId: "",
    };
  }
  return {
    proveedorId: String(lote.proveedorId),
    tamboId: String(lote.tamboId),
    materiaPrima: lote.materiaPrima,
    fechaIngreso: lote.fechaIngreso.slice(0, 10),
    // No editable en PATCH /lotes/:id (ver UpdateLoteDto): en edición se
    // muestra de solo lectura más abajo, no hace falta en el form value.
    cantidad: lote.cantidad != null ? String(lote.cantidad) : "",
    parametros: buildParametrosVacios(),
    destinoInicial: lote.destinoInicial ?? "",
    ubicacionInicial: lote.ubicacionInicial ?? "",
    // HU-69: no aplica en edición, la sección "Datos del remito" solo se
    // muestra al crear (ver !esEdicion más abajo).
    numeroRemito: "",
    // HU-66: tampoco editable en PATCH /lotes/:id.
    cantidadComprometida: "",
    parametrosComprometidos: buildParametrosVacios(),
    // HU-34/HU-37: el destino vigente se carga async (GET
    // /lotes/:id/destino-productivo/historial, ver useDestinoProductivoLote)
    // y se aplica una sola vez cuando llega — ver el efecto que sincroniza
    // destinoHistorial más abajo. Acá arranca vacío.
    destinoProductivoId: "",
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
  return configs.find(
    (c) => c.parametro === parametro && c.tipoMateriaPrima === materiaPrima,
  );
}

function validate(
  values: FormValues,
  configs: ConfigParametro[],
  esEdicion: boolean,
): FormErrors {
  const errors: FormErrors = {};

  if (!values.proveedorId) errors.proveedorId = "El proveedor es obligatorio";
  // HU-36 AC1/AC4: tambo de origen obligatorio, igual de estricto que
  // proveedorId (CreateLoteDto.tamboId en el backend no tiene @IsOptional).
  if (!values.tamboId) errors.tamboId = "El tambo de origen es obligatorio";
  if (!values.fechaIngreso)
    errors.fechaIngreso = "La fecha de ingreso es obligatoria";
  if (!values.destinoInicial)
    errors.destinoInicial = "El destino inicial es obligatorio";

  // PATCH /lotes/:id no acepta cantidad ni parametros (ver UpdateLoteDto /
  // LoteService.update en el backend): en edición no hay nada más que
  // validar acá.
  if (esEdicion) return errors;

  // HU-68: obligatoria en el backend (CreateLoteDto.cantidad, @IsPositive) —
  // habilita el consumo parcial posterior de este lote.
  if (values.cantidad.trim() === "") {
    errors.cantidad = "La cantidad ingresada es obligatoria";
  } else if (
    Number.isNaN(Number(values.cantidad)) ||
    Number(values.cantidad) <= 0
  ) {
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
      parametrosErrors[parametro] =
        `Debe estar entre ${config.umbralMin} y ${config.umbralMax}`;
    }
  }
  if (Object.keys(parametrosErrors).length > 0)
    errors.parametros = parametrosErrors;
  if (!algunoCargado)
    errors.parametrosGeneral = "Cargá al menos un parámetro de calidad";

  // HU-69 (AC1, AC3, AC5): a diferencia del resto de "datos del remito",
  // obligatorio y con formato validado — dos mensajes distintos según el
  // motivo del rechazo (Pantalla 9: "valida en tiempo real dos situaciones
  // diferenciadas: el campo vacío y el ingreso de caracteres inválidos").
  const numeroRemitoTrim = values.numeroRemito.trim();
  if (numeroRemitoTrim === "") {
    errors.numeroRemito = "El número de remito es obligatorio.";
  } else if (!NUMERO_REMITO_REGEX.test(numeroRemitoTrim)) {
    errors.numeroRemito = "Formato inválido. Usá solo letras, números y guiones.";
  }

  // HU-66: cantidad/calidad comprometidas, opcionales (AC4) — solo se valida
  // formato de lo que sí se cargó.
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
      comprometidosErrors[parametro] =
        "Cargá primero el valor real medido de este parámetro";
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
  // HU-34: "procesado" = ya no admite cambios de destino productivo.
  const loteEstaProcesado =
    !!lote && (lote.estado === EstadoLote.FINALIZADO || lote.estado === EstadoLote.RECHAZADO);
  const { configs } = useConfigParametros();
  // HU-34/HU-37: el destino vigente puede venir de una asignación manual
  // (este modal) o de haber aceptado/rechazado una recomendación ML
  // (RecomendacionDestinoCard, que recibe destinoVigente/divergenciaVigente
  // por prop para no duplicar el fetch) — se calcula acá una sola vez con
  // el historial real del backend, GET /lotes/:id/destino-productivo/historial.
  const destinoHistorial = useDestinoProductivoLote(esEdicion ? lote!.id : null);
  const { destinoVigente } = destinoHistorial;
  // Ver el efecto de sincronización más abajo: evita pisar la elección del
  // usuario si destinoHistorial se vuelve a disparar durante la misma
  // apertura del modal.
  const destinoVigenteAplicado = useRef(false);
  const { destinosActivos: destinosProductivos } = useCatalogoDestinosProductivos();
  const [values, setValues] = useState<FormValues>(() => buildInitialValues(lote));
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState("");
  const [cerrarCicloError, setCerrarCicloError] = useState("");
  const [cerrarCicloMensaje, setCerrarCicloMensaje] = useState("");

  // Tras crear el lote, si el backend sugiere sensoresDisponibles (activos
  // en la misma ubicacionInicial), se ofrece asociarlos sin salir del modal
  // en vez de pedirlos aparte.
  const [paso, setPaso] = useState<Paso>("form");
  const [loteCreadoId, setLoteCreadoId] = useState<number | null>(null);
  const [sensoresDisponibles, setSensoresDisponibles] = useState<Sensor[]>([]);
  const [sensoresSeleccionados, setSensoresSeleccionados] = useState<
    Set<number>
  >(new Set());
  const [isAsociando, setIsAsociando] = useState(false);
  const [asociarError, setAsociarError] = useState("");

  // Advertencias no bloqueantes de POST /lotes (ej. parámetro fuera de rango
  // o sin config de umbral): el lote se guarda igual, pero no queremos que
  // se pierdan silenciosamente cerrando el modal solo.
  const [warnings, setWarnings] = useState<string[]>([]);

  // HU-69: si ya se tocó el campo de número de remito — recién ahí se
  // muestran sus errores en tiempo real (Pantalla 9), para no arrancar el
  // form con un campo obligatorio en rojo antes de que el usuario escriba
  // nada.
  const [numeroRemitoTocado, setNumeroRemitoTocado] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setValues(buildInitialValues(lote));
    setErrors({});
    setServerError("");
    setCerrarCicloError("");
    setCerrarCicloMensaje("");
    setPaso("form");
    setLoteCreadoId(null);
    setSensoresDisponibles([]);
    setSensoresSeleccionados(new Set());
    setAsociarError("");
    setWarnings([]);
    setNumeroRemitoTocado(false);
    destinoVigenteAplicado.current = false;
  }, [isOpen, lote]);

  // HU-34/HU-37: destinoVigente llega async (ver arriba) — se completa acá,
  // una sola vez por apertura del modal, para no pisar lo que el usuario ya
  // haya elegido en el selector si el fetch tarda o se vuelve a disparar.
  useEffect(() => {
    if (!isOpen || !esEdicion) return;
    if (destinoHistorial.isLoading) return;
    if (destinoVigenteAplicado.current) return;
    destinoVigenteAplicado.current = true;
    setValues((prev) => ({
      ...prev,
      destinoProductivoId: destinoVigente?.destinoActualId ?? "",
    }));
  }, [isOpen, esEdicion, destinoHistorial.isLoading, destinoVigente]);

  // HU-69 (AC1, AC3, Pantalla 9): validación en tiempo real, no solo al
  // enviar — "manteniendo deshabilitada la confirmación hasta que el valor
  // resulte válido". Dos mensajes distintos, mismo criterio que validate().
  const numeroRemitoTrimmed = values.numeroRemito.trim();
  const numeroRemitoVacio = numeroRemitoTrimmed === "";
  const numeroRemitoFormatoInvalido =
    !numeroRemitoVacio && !NUMERO_REMITO_REGEX.test(numeroRemitoTrimmed);
  const numeroRemitoValido = !numeroRemitoVacio && !numeroRemitoFormatoInvalido;
  const numeroRemitoErrorEnVivo = !numeroRemitoTocado
    ? undefined
    : numeroRemitoVacio
      ? "El número de remito es obligatorio."
      : numeroRemitoFormatoInvalido
        ? "Formato inválido. Usá solo letras, números y guiones."
        : undefined;

  // HU-36: combo encadenado — la lista de tambos depende del proveedor
  // elegido (GET /tambos?proveedorId=xxx). En edición, proveedorId ya viene
  // fijo desde el lote, así que esto también sirve para poblar el nombre del
  // tambo actual (mostrado deshabilitado, no editable — ver LoteService.update
  // en el backend: tamboId no se puede reasignar una vez creado el lote).
  const { tambos, isLoading: isLoadingTambos } = useTambosPorProveedor(
    values.proveedorId ? Number(values.proveedorId) : null,
  );

  if (!isOpen) return null;

  const proveedorOptions = [
    { value: "", label: "Seleccioná un proveedor" },
    ...proveedores.map((p) => ({
      value: String(p.id),
      label: `${p.razonSocial} (${p.cuit})`,
    })),
  ];

  const tamboOptions = [
    {
      value: "",
      label: values.proveedorId
        ? "Seleccioná un tambo"
        : "Elegí primero un proveedor",
    },
    ...tambos.map((t) => ({ value: String(t.id), label: t.nombre })),
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

  const setParametroComprometido = (
    parametro: ParametroVisible,
    valor: string,
  ) => {
    setValues((prev) => ({
      ...prev,
      parametrosComprometidos: {
        ...prev.parametrosComprometidos,
        [parametro]: valor,
      },
    }));
  };

  // HU-34 AC1/AC3: PATCH /lotes/:id/destino-productivo — solo se llama si
  // efectivamente se eligió un destino distinto al vigente (AC3: "sin
  // duplicar registros" cuando no cambió nada). Devuelve un mensaje de
  // error si falló, o null si no hacía falta hacer nada o si salió bien.
  const asignarDestinoProductivoSiCorresponde = async (
    loteId: number,
  ): Promise<string | null> => {
    if (values.destinoProductivoId === "") return null;
    if (values.destinoProductivoId === destinoVigente?.destinoActualId) return null;
    try {
      await loteService.asignarDestinoProductivo(loteId, values.destinoProductivoId);
      destinoHistorial.refetch();
      return null;
    } catch (err) {
      return extraerMensajeError(
        err,
        "No se pudo asignar el destino productivo elegido.",
      );
    }
  };

  // HU-34 (AC4, mock visual): "cerrar el ciclo" en sí no tiene endpoint
  // real todavía — lo único implementado es el bloqueo cuando falta el
  // destino productivo, que es lo que pide el criterio de aceptación.
  const handleCerrarCiclo = () => {
    setCerrarCicloMensaje("");
    if (!destinoVigente) {
      setCerrarCicloError("El destino productivo es obligatorio para cerrar el ciclo del lote.");
      return;
    }
    setCerrarCicloError("");
    setCerrarCicloMensaje(
      "Destino productivo asignado — validación lista. El cierre real del ciclo todavía no está conectado al backend.",
    );
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
          fechaIngreso: new Date(
            `${values.fechaIngreso}T12:00:00`,
          ).toISOString(),
          destinoInicial: values.destinoInicial as DestinoLote,
        });
      } catch (err) {
        setServerError(
          extraerMensajeError(
            err,
            "No se pudo actualizar el lote. Intentá nuevamente.",
          ),
        );
        return;
      }
      // El lote ya se actualizó — si falla solo esta parte, no tiene
      // sentido revertir lo anterior: se muestra el error y se deja el
      // modal abierto para que se pueda reintentar únicamente el destino.
      const errorDestino = await asignarDestinoProductivoSiCorresponde(lote!.id);
      if (errorDestino) {
        setServerError(errorDestino);
        return;
      }
      onClose();
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
        ...(comprometido !== ""
          ? { valorComprometido: Number(comprometido) }
          : {}),
      };
    });

    try {
      const respuesta = await onCreate({
        proveedorId: Number(values.proveedorId),
        tamboId: Number(values.tamboId), // HU-36
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

      // El lote ya se creó — si la asignación de destino falla, no tiene
      // sentido perder el resto del flujo (asociar sensores, etc.): se
      // suma como una advertencia más en vez de cortar acá.
      const advertencias = [...(respuesta.warnings ?? [])];
      const errorDestino = await asignarDestinoProductivoSiCorresponde(respuesta.lote.id);
      if (errorDestino) {
        advertencias.push(
          `${errorDestino} Podés asignarlo después desde "Editar lote".`,
        );
      }
      // HU-69 (mock visual): el backend todavía no tiene columna para esto,
      // ver useRemitoLote.ts — la validación ya garantizó que llegue no
      // vacío y con formato válido antes de este punto.
      registrarRemitoLote(respuesta.lote.id, numeroRemitoTrimmed);
      setWarnings(advertencias);

      if (respuesta.sensoresDisponibles.length > 0) {
        setLoteCreadoId(respuesta.lote.id);
        setSensoresDisponibles(respuesta.sensoresDisponibles);
        setPaso("asociar");
      } else if (advertencias.length > 0) {
        setPaso("warnings");
      } else {
        onClose();
      }
    } catch (err) {
      setServerError(
        extraerMensajeError(
          err,
          "No se pudo registrar el lote. Intentá nuevamente.",
        ),
      );
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
      await sensorService.asociarALote(loteCreadoId, [
        ...sensoresSeleccionados,
      ]);
      onClose();
    } catch (err) {
      setAsociarError(
        extraerMensajeErrorSensor(
          err,
          "No se pudieron asociar los sensores seleccionados.",
        ),
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
        <div className="flex flex-col items-end gap-2">
          {cerrarCicloError && (
            <p className="text-sm text-red-600 dark:text-red-400">{cerrarCicloError}</p>
          )}
          {cerrarCicloMensaje && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">{cerrarCicloMensaje}</p>
          )}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <Button
              type="submit"
              form="lote-form"
              isLoading={isSubmitting}
              // HU-69 (Pantalla 9): "manteniendo deshabilitada la
              // confirmación hasta que el valor resulte válido" — solo
              // aplica al crear, la sección de remito no existe en edición.
              disabled={!esEdicion && !numeroRemitoValido}
              className="!w-auto px-6"
            >
              {esEdicion ? "Guardar destino" : "Registrar lote"}
            </Button>
            {/* HU-34 (AC4, mock visual): valida que haya un destino
                productivo asignado. El cierre de ciclo en sí todavía no
                tiene endpoint real — a propósito no reemplaza ni reutiliza
                el flujo real de "Finalizar lote" (FinalizarLoteModal, HU-62). */}
            {esEdicion && (
              <button
                type="button"
                onClick={handleCerrarCiclo}
                title="Pendiente de conexión real con el backend — valida el destino productivo"
                className="rounded-lg bg-[#3d6fcf] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#3460b5]"
              >
                Cerrar ciclo del lote
              </button>
            )}
          </div>
        </div>
      }
    >
      <form
        id="lote-form"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-6"
      >
        {/* Datos del lote */}
        <div className="flex flex-col gap-3">
          <SectionHeader>DATOS DEL LOTE</SectionHeader>
          {/* HU-36 AC3: la HU pide poder agregar un proveedor o tambo nuevo
              sin salir de este formulario. A propósito NO se implementa acá
              todavía — decisión tomada con el usuario tras confirmar el gap:
              TODO(backend): quien abre este formulario es siempre Responsable
              de Calidad (ver puedeCrearLote en LotesPage.tsx, espeja
              @Roles(RESPONSABLE_CALIDAD) de POST /lotes), pero ese rol no
              está habilitado ni en POST /tambos (@Roles: OPERARIO_LINEA,
              GERENTE) ni en POST /proveedores (@Roles: GERENTE,
              ADMINISTRADOR) — un quick-add acá le devolvería 403 siempre.
              Solo se conectan los selectores de lectura (GET /proveedores,
              GET /tambos), que sí incluyen a Responsable de Calidad.
              Reportado al equipo para sumar RESPONSABLE_CALIDAD a esos dos
              endpoints del lado del backend; reevaluar el quick-add cuando
              eso se resuelva. Mientras tanto, Responsable de Calidad puede
              pedirle a un Operario de línea/Gerente que cargue el tambo
              faltante desde /tambos (ver TambosPage.tsx) antes de volver acá
              a completar el lote — no es ideal, pero ya no depende de tocar
              la base a mano: existe una pantalla real para eso. */}
          <Select
            id="lote-proveedor"
            label="Proveedor *"
            options={proveedorOptions}
            value={values.proveedorId}
            disabled={esEdicion}
            onChange={(e) =>
              // Cambiar de proveedor invalida el tambo ya elegido (pertenece
              // al proveedor anterior): se limpia para forzar una nueva
              // selección dentro de la lista encadenada correcta.
              setValues((prev) => ({
                ...prev,
                proveedorId: e.target.value,
                tamboId: "",
              }))
            }
            error={errors.proveedorId}
          />
          {esEdicion && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              El proveedor no se puede modificar una vez creado el lote.
            </p>
          )}

          {/* HU-36: tambo de origen, obligatorio y dependiente del proveedor
              elegido arriba (combo encadenado, GET /tambos?proveedorId=xxx). */}
          <Select
            id="lote-tambo"
            label="Tambo de origen *"
            options={tamboOptions}
            value={values.tamboId}
            disabled={esEdicion || !values.proveedorId || isLoadingTambos}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, tamboId: e.target.value }))
            }
            error={errors.tamboId}
          />
          {esEdicion && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              El tambo de origen no se puede modificar una vez creado el lote.
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
                    setValues((prev) => ({
                      ...prev,
                      materiaPrima: value as TipoMateriaPrima,
                    }))
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
            onChange={(e) =>
              setValues((prev) => ({ ...prev, fechaIngreso: e.target.value }))
            }
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
                {lote!.cantidad != null
                  ? `${lote!.cantidad} L`
                  : "No registrada"}
              </p>
            </div>
          ) : (
            <Input
              id="lote-cantidad"
              type="number"
              inputMode="decimal"
              label="Cantidad ingresada (L) *"
              value={values.cantidad}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, cantidad: e.target.value }))
              }
              error={errors.cantidad}
            />
          )}
        </div>

        {/* Parámetros de calidad: PATCH /lotes/:id no los acepta (ver
            UpdateLoteDto), así que en edición se muestran de solo lectura. */}
        <div className="flex flex-col gap-3">
          <SectionHeader>
            {esEdicion
              ? "PARÁMETROS DE CALIDAD"
              : "PARÁMETROS DE CALIDAD (opcional, al menos uno)"}
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
                      {PARAMETROS_META[p.parametro as ParametroVisible]
                        ?.label ?? p.parametro}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {p.valor}
                    </p>
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
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.parametrosGeneral}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {ORDEN_PARAMETROS.map((parametro) => {
                  const meta = PARAMETROS_META[parametro];
                  const config = buscarConfig(
                    configs,
                    parametro,
                    values.materiaPrima,
                  );
                  return (
                    <Input
                      key={parametro}
                      id={`lote-param-${parametro}`}
                      label={`${meta.label} (${meta.unidad})`}
                      type="number"
                      inputMode="decimal"
                      placeholder={
                        config
                          ? `${config.umbralMin} a ${config.umbralMax}`
                          : ""
                      }
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

        {/* HU-66/HU-69: datos del remito. Ya no es una sección opcional
            colapsada: desde HU-69 el número de remito es obligatorio (AC1),
            así que se muestra siempre expandida — ocultar por defecto un
            campo requerido detrás de un acordeón habría sido peor que
            mostrarlo siempre. Cantidad y calidad comprometidas siguen
            siendo opcionales (HU-66 AC4), sin cambios ahí. PATCH
            /lotes/:id no acepta ninguno de estos campos, así que en
            edición no se muestra la sección (mismo criterio que antes). */}
        {!esEdicion && (
          <div className="flex flex-col gap-3">
            <SectionHeader>DATOS DEL REMITO</SectionHeader>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              El número de remito es obligatorio. La cantidad y la calidad
              comprometidas son opcionales si no contás con el remito
              completo al momento de la carga.
            </p>

            <Input
              id="lote-numeroRemito"
              label="Número de remito *"
              placeholder="R-000123"
              value={values.numeroRemito}
              onChange={(e) => {
                setNumeroRemitoTocado(true);
                setValues((prev) => ({ ...prev, numeroRemito: e.target.value }));
              }}
              onBlur={() => setNumeroRemitoTocado(true)}
              error={numeroRemitoErrorEnVivo ?? errors.numeroRemito}
            />
            <p className="-mt-2 text-xs text-slate-400 dark:text-slate-500">
              Alfanumérico, letras y números con guiones. Ejemplo: R-000123.
            </p>

            <Input
              id="lote-cantidadComprometida"
              type="number"
              inputMode="decimal"
              label="Cantidad comprometida según remito"
              value={values.cantidadComprometida}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  cantidadComprometida: e.target.value,
                }))
              }
              error={errors.cantidadComprometida}
            />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {ORDEN_PARAMETROS.map((parametro) => {
                const meta = PARAMETROS_META[parametro];
                const tieneValorReal =
                  values.parametros[parametro].trim() !== "";
                return (
                  <Input
                    key={`comprometido-${parametro}`}
                    id={`lote-param-comprometido-${parametro}`}
                    label={`${meta.label} comprometido (${meta.unidad})`}
                    type="number"
                    inputMode="decimal"
                    disabled={!tieneValorReal}
                    placeholder={
                      tieneValorReal ? "" : "Cargá primero el valor real"
                    }
                    value={values.parametrosComprometidos[parametro]}
                    onChange={(e) =>
                      setParametroComprometido(parametro, e.target.value)
                    }
                    error={errors.parametrosComprometidos?.[parametro]}
                    className={!tieneValorReal ? "opacity-60" : ""}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Destino */}
        <div className="flex flex-col gap-3">
          <SectionHeader>DESTINO PRODUCTIVO</SectionHeader>
          {esEdicion && (
            <RecomendacionDestinoCard
              loteId={lote!.id}
              destinoVigente={destinoHistorial.destinoVigente}
              divergenciaVigente={destinoHistorial.divergenciaVigente}
              onDestinoRespondido={destinoHistorial.refetch}
            />
          )}

          {/* HU-34: selector plano del catálogo configurable de destinos
              productivos (queso, yogur, crema, etc.), PATCH
              /lotes/:id/destino-productivo — no confundir con "Destino
              inicial" de más abajo, que es el enum fijo de
              ubicación/tratamiento. Editable mientras el lote no esté
              procesado (finalizado o rechazado). */}
          {loteEstaProcesado ? (
            <div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Destino productivo
              </span>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {destinoVigente?.destinoActualNombre ?? "Sin asignar"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                El lote ya fue procesado: el destino productivo no se puede modificar.
              </p>
            </div>
          ) : (
            <>
              <Select
                id="lote-destino-productivo"
                label="Destino productivo"
                options={[
                  { value: "", label: "Sin asignar" },
                  ...destinosProductivos.map((d) => ({ value: String(d.id), label: d.nombre })),
                ]}
                value={values.destinoProductivoId === "" ? "" : String(values.destinoProductivoId)}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    destinoProductivoId: e.target.value === "" ? "" : Number(e.target.value),
                  }))
                }
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Opcional al registrar el lote. Es obligatorio para cerrar el ciclo y se puede
                modificar mientras el lote no esté procesado.
              </p>
            </>
          )}

          <Select
            id="lote-destino"
            label="Destino inicial *"
            options={DESTINO_OPTIONS}
            value={values.destinoInicial}
            onChange={(e) =>
              setValues((prev) => ({
                ...prev,
                destinoInicial: e.target.value as DestinoLote,
              }))
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
              setValues((prev) => ({
                ...prev,
                ubicacionInicial: e.target.value as Ubicacion,
              }))
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
