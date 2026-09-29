import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Button } from "../../../components/ui/Button";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import {
  CATEGORIA_META,
  EQUIPOS,
  FORMA_CONEXION_LABEL,
  TIPO_SENAL_LABEL,
  type CategoriaDispositivo,
  type Dispositivo,
  type FormaConexion,
  type TipoSenal,
} from "../constants/dispositivos";

interface FormValues {
  nombre: string;
  numeroSerie: string;
  marca: string;
  modelo: string;
  categoria: CategoriaDispositivo;
  equipo: string;
  ubicacionPlanta: string;
  tipoSenal: TipoSenal;
  alimentacion: string;
  rangoMin: string;
  rangoMax: string;
  unidad: string;
  fechaCalibracion: string;
  formaConexion: FormaConexion;
}

const VALORES_INICIALES: FormValues = {
  nombre: "",
  numeroSerie: "",
  marca: "",
  modelo: "",
  categoria: "sensor_proceso",
  equipo: EQUIPOS[0],
  ubicacionPlanta: "",
  tipoSenal: "4-20mA",
  alimentacion: "",
  rangoMin: "",
  rangoMax: "",
  unidad: "",
  fechaCalibracion: new Date().toISOString().slice(0, 10),
  formaConexion: "directa",
};

function dispositivoAValores(d: Dispositivo): FormValues {
  return {
    nombre: d.nombre,
    numeroSerie: d.numeroSerie,
    marca: d.marca,
    modelo: d.modelo,
    categoria: d.categoria,
    equipo: d.equipo,
    ubicacionPlanta: d.ubicacionPlanta,
    tipoSenal: d.tipoSenal,
    alimentacion: d.alimentacion,
    rangoMin: String(d.rangoMin),
    rangoMax: String(d.rangoMax),
    unidad: d.unidad,
    fechaCalibracion: d.fechaCalibracion,
    formaConexion: d.formaConexion,
  };
}

interface FormErrors {
  nombre?: string;
  numeroSerie?: string;
  marca?: string;
  modelo?: string;
  equipo?: string;
  ubicacionPlanta?: string;
  rangoMin?: string;
  rangoMax?: string;
  unidad?: string;
  fechaCalibracion?: string;
}

function validar(values: FormValues, numerosSerieExistentes: Set<string>): FormErrors {
  const errores: FormErrors = {};
  if (!values.nombre.trim()) errores.nombre = "El nombre es obligatorio";
  if (!values.numeroSerie.trim()) {
    errores.numeroSerie = "El número de serie es obligatorio";
  } else if (numerosSerieExistentes.has(values.numeroSerie.trim().toLowerCase())) {
    errores.numeroSerie = "Ya existe un dispositivo con este número de serie";
  }
  if (!values.marca.trim()) errores.marca = "La marca es obligatoria";
  if (!values.modelo.trim()) errores.modelo = "El modelo es obligatorio";
  if (!values.ubicacionPlanta.trim()) errores.ubicacionPlanta = "La ubicación en planta es obligatoria";
  if (!values.unidad.trim()) errores.unidad = "La unidad es obligatoria";
  if (!values.fechaCalibracion) errores.fechaCalibracion = "La fecha de calibración es obligatoria";

  const min = Number(values.rangoMin);
  const max = Number(values.rangoMax);
  if (values.rangoMin.trim() === "" || Number.isNaN(min)) {
    errores.rangoMin = "Ingresá un valor numérico";
  }
  if (values.rangoMax.trim() === "" || Number.isNaN(max)) {
    errores.rangoMax = "Ingresá un valor numérico";
  }
  if (!errores.rangoMin && !errores.rangoMax && min >= max) {
    errores.rangoMax = "Debe ser mayor al mínimo";
  }

  return errores;
}

interface DispositivoFormModalProps {
  isOpen: boolean;
  dispositivo: Dispositivo | null; // presente = modo edición
  numerosSerieExistentes: Set<string>;
  onClose: () => void;
  onGuardar: (dto: Omit<Dispositivo, "id" | "estado" | "ultimoDato" | "bajaLogica" | "conexionPosible">) => void;
}

export function DispositivoFormModal({
  isOpen,
  dispositivo,
  numerosSerieExistentes,
  onClose,
  onGuardar,
}: DispositivoFormModalProps) {
  const esEdicion = !!dispositivo;
  const [values, setValues] = useState<FormValues>(VALORES_INICIALES);
  const [errores, setErrores] = useState<FormErrors>({});

  useEffect(() => {
    if (!isOpen) return;
    setValues(dispositivo ? dispositivoAValores(dispositivo) : VALORES_INICIALES);
    setErrores({});
  }, [isOpen, dispositivo]);

  if (!isOpen) return null;

  const equipoOptions = EQUIPOS.map((e) => ({ value: e, label: e }));
  const categoriaOptions = (Object.entries(CATEGORIA_META) as [CategoriaDispositivo, { label: string }][]).map(
    ([value, meta]) => ({ value, label: meta.label }),
  );
  const tipoSenalOptions = (Object.entries(TIPO_SENAL_LABEL) as [TipoSenal, string][]).map(([value, label]) => ({
    value,
    label,
  }));
  const formaConexionOptions = (Object.entries(FORMA_CONEXION_LABEL) as [FormaConexion, string][]).map(
    ([value, label]) => ({ value, label }),
  );

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Al editar, el propio número de serie del dispositivo no cuenta como
    // "ya existente" contra sí mismo.
    const existentes = esEdicion
      ? new Set(
          [...numerosSerieExistentes].filter(
            (s) => s !== dispositivo!.numeroSerie.trim().toLowerCase(),
          ),
        )
      : numerosSerieExistentes;

    const validationErrors = validar(values, existentes);
    setErrores(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    onGuardar({
      codigo: dispositivo?.codigo ?? "",
      nombre: values.nombre.trim(),
      numeroSerie: values.numeroSerie.trim(),
      marca: values.marca.trim(),
      modelo: values.modelo.trim(),
      categoria: values.categoria,
      equipo: values.equipo,
      ubicacionPlanta: values.ubicacionPlanta.trim(),
      tipoSenal: values.tipoSenal,
      alimentacion: values.alimentacion.trim(),
      rangoMin: Number(values.rangoMin),
      rangoMax: Number(values.rangoMax),
      unidad: values.unidad.trim(),
      fechaCalibracion: values.fechaCalibracion,
      formaConexion: values.formaConexion,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      title={esEdicion ? "Editar dispositivo" : "Nuevo dispositivo"}
      description={
        esEdicion
          ? `Actualizá los datos de ${dispositivo!.nombre}`
          : "Registrá un sensor o actuador relevado en planta"
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
          <Button type="submit" form="dispositivo-form" className="!w-auto px-6">
            {esEdicion ? "Guardar cambios" : "Registrar dispositivo"}
          </Button>
        </div>
      }
    >
      <form id="dispositivo-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <SectionHeader>IDENTIFICACIÓN</SectionHeader>
          <Input
            id="disp-nombre"
            label="Nombre *"
            placeholder="Ej: Temperatura salida pasteurizador"
            value={values.nombre}
            onChange={(e) => setValues((p) => ({ ...p, nombre: e.target.value }))}
            error={errores.nombre}
            autoFocus
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              id="disp-numeroSerie"
              label="Número de serie *"
              placeholder="Ej: EH-TR10-44822"
              value={values.numeroSerie}
              onChange={(e) => setValues((p) => ({ ...p, numeroSerie: e.target.value }))}
              error={errores.numeroSerie}
            />
            <Select
              id="disp-categoria"
              label="Tipo *"
              options={categoriaOptions}
              value={values.categoria}
              onChange={(e) =>
                setValues((p) => ({ ...p, categoria: e.target.value as CategoriaDispositivo }))
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              id="disp-marca"
              label="Marca *"
              placeholder="Ej: Endress+Hauser"
              value={values.marca}
              onChange={(e) => setValues((p) => ({ ...p, marca: e.target.value }))}
              error={errores.marca}
            />
            <Input
              id="disp-modelo"
              label="Modelo *"
              placeholder="Ej: PT100"
              value={values.modelo}
              onChange={(e) => setValues((p) => ({ ...p, modelo: e.target.value }))}
              error={errores.modelo}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <SectionHeader>UBICACIÓN Y CONEXIÓN</SectionHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              id="disp-equipo"
              label="Equipo *"
              options={equipoOptions}
              value={values.equipo}
              onChange={(e) => setValues((p) => ({ ...p, equipo: e.target.value }))}
            />
            <Input
              id="disp-ubicacionPlanta"
              label="Ubicación en planta *"
              placeholder="Ej: Pasteurizador – entrada de agua caliente"
              value={values.ubicacionPlanta}
              onChange={(e) => setValues((p) => ({ ...p, ubicacionPlanta: e.target.value }))}
              error={errores.ubicacionPlanta}
            />
          </div>
          <Select
            id="disp-formaConexion"
            label="Forma de conexión *"
            options={formaConexionOptions}
            value={values.formaConexion}
            onChange={(e) => setValues((p) => ({ ...p, formaConexion: e.target.value as FormaConexion }))}
          />
        </div>

        <div className="flex flex-col gap-3">
          <SectionHeader>SEÑAL Y CALIBRACIÓN</SectionHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select
              id="disp-tipoSenal"
              label="Tipo de señal *"
              options={tipoSenalOptions}
              value={values.tipoSenal}
              onChange={(e) => setValues((p) => ({ ...p, tipoSenal: e.target.value as TipoSenal }))}
            />
            <Input
              id="disp-alimentacion"
              label="Alimentación"
              placeholder="Ej: 24V DC"
              value={values.alimentacion}
              onChange={(e) => setValues((p) => ({ ...p, alimentacion: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              id="disp-rangoMin"
              type="number"
              inputMode="decimal"
              label="Rango mínimo *"
              value={values.rangoMin}
              onChange={(e) => setValues((p) => ({ ...p, rangoMin: e.target.value }))}
              error={errores.rangoMin}
            />
            <Input
              id="disp-rangoMax"
              type="number"
              inputMode="decimal"
              label="Rango máximo *"
              value={values.rangoMax}
              onChange={(e) => setValues((p) => ({ ...p, rangoMax: e.target.value }))}
              error={errores.rangoMax}
            />
            <Input
              id="disp-unidad"
              label="Unidad *"
              placeholder="Ej: °C"
              value={values.unidad}
              onChange={(e) => setValues((p) => ({ ...p, unidad: e.target.value }))}
              error={errores.unidad}
            />
          </div>
          <Input
            id="disp-fechaCalibracion"
            type="date"
            label="Fecha de calibración *"
            value={values.fechaCalibracion}
            onChange={(e) => setValues((p) => ({ ...p, fechaCalibracion: e.target.value }))}
            error={errores.fechaCalibracion}
          />
        </div>
      </form>
    </Modal>
  );
}
