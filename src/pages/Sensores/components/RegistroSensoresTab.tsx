import { useState } from "react";
import { Pencil, Link2 } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Select } from "../../../components/ui/Select";
import { SensorEstadoBadge } from "../../../components/SensorEstadoBadge";
import {
  EstadoSensor,
  Ubicacion,
  type CreateSensorDto,
  type Sensor,
  type SensorFilterQuery,
  type UpdateSensorDto,
} from "../../../types/sensor.types";
import { SensorFormModal, type SensorFormValues } from "../SensorFormModal";
import { SensorLoteHistorialModal } from "./SensorLoteHistorialModal";
import { PARAMETRO_LABEL, TIPO_SENSOR_LABEL, UBICACION_LABEL } from "../constants/parametroSensor";

const ESTADO_LABEL: Record<EstadoSensor, string> = {
  [EstadoSensor.ACTIVO]: "Activo",
  [EstadoSensor.INACTIVO]: "Inactivo",
  [EstadoSensor.FALLA]: "Con falla",
};

const ESTADO_FILTER_OPTIONS = [
  { value: "", label: "Todos los estados" },
  ...Object.values(EstadoSensor).map((e) => ({ value: e, label: ESTADO_LABEL[e] })),
];

const UBICACION_FILTER_OPTIONS = [
  { value: "", label: "Todas las ubicaciones" },
  ...Object.values(Ubicacion).map((u) => ({ value: u, label: UBICACION_LABEL[u] })),
];

const HEADERS = ["NOMBRE", "TIPO", "PARÁMETRO", "UBICACIÓN", "RANGO FAVORABLE", "ESTADO", ""];

interface RegistroSensoresTabProps {
  sensores: Sensor[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createSensor: (dto: CreateSensorDto) => Promise<Sensor>;
  isCreating: boolean;
  updateSensor: (id: number, dto: UpdateSensorDto) => Promise<Sensor>;
  isUpdating: boolean;
  puedeGestionar: boolean;
  puedeAsociar: boolean;
  filtros: SensorFilterQuery;
  onFiltrosChange: (filtros: SensorFilterQuery) => void;
}

export function RegistroSensoresTab({
  sensores,
  isLoading,
  error,
  refetch,
  createSensor,
  isCreating,
  updateSensor,
  isUpdating,
  puedeGestionar,
  puedeAsociar,
  filtros,
  onFiltrosChange,
}: RegistroSensoresTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSensor, setEditingSensor] = useState<Sensor | null>(null);
  const [sensorHistorial, setSensorHistorial] = useState<Sensor | null>(null);

  const abrirAlta = () => {
    setEditingSensor(null);
    setIsModalOpen(true);
  };

  const abrirEdicion = (sensor: Sensor) => {
    setEditingSensor(sensor);
    setIsModalOpen(true);
  };

  const cerrarModal = () => {
    setIsModalOpen(false);
    setEditingSensor(null);
  };

  const handleSubmit = (dto: SensorFormValues) => {
    if (editingSensor) {
      const { ubicacion, ...updateDto } = dto;
      return updateSensor(editingSensor.id, updateDto);
    }
    return createSensor(dto);
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Select
            id="filtro-ubicacion"
            label="Ubicación"
            options={UBICACION_FILTER_OPTIONS}
            value={filtros.ubicacion ?? ""}
            onChange={(e) =>
              onFiltrosChange({
                ...filtros,
                ubicacion: (e.target.value || undefined) as Ubicacion | undefined,
              })
            }
          />
          <Select
            id="filtro-estado"
            label="Estado"
            options={ESTADO_FILTER_OPTIONS}
            value={filtros.estado ?? ""}
            onChange={(e) =>
              onFiltrosChange({
                ...filtros,
                estado: (e.target.value || undefined) as EstadoSensor | undefined,
              })
            }
          />
        </div>
        {puedeGestionar && (
          <Button type="button" className="!w-auto px-6" onClick={abrirAlta}>
            + Agregar sensor
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
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando sensores...</p>
        </div>
      ) : sensores.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-base font-medium text-slate-700 dark:text-slate-300">
            No hay sensores registrados
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {puedeGestionar
              ? 'Registrá el primer sensor con el botón "+ Agregar sensor".'
              : "Todavía no hay sensores registrados que coincidan con los filtros."}
          </p>
        </div>
      ) : (
        <>
          {/* Tabla (md+) */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                  {HEADERS.map((h) => (
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
                {sensores.map((sensor) => (
                  <tr key={sensor.id} className="text-sm">
                    <td className="px-5 py-3 font-medium text-slate-900 dark:text-white">
                      {sensor.nombre}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {TIPO_SENSOR_LABEL[sensor.tipo]}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {PARAMETRO_LABEL[sensor.parametro] ?? sensor.parametro}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {UBICACION_LABEL[sensor.ubicacion]}
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {sensor.rangoMinFavor} – {sensor.rangoMaxFavor}
                    </td>
                    <td className="px-5 py-3">
                      <SensorEstadoBadge estado={sensor.estado} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSensorHistorial(sensor)}
                          className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                          title="Asociación a lote / historial"
                        >
                          <Link2 className="h-4 w-4" />
                        </button>
                        {puedeGestionar && (
                          <button
                            type="button"
                            onClick={() => abrirEdicion(sensor)}
                            className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                            title="Editar sensor"
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
            {sensores.map((sensor) => (
              <div
                key={sensor.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900 dark:text-white">
                      {sensor.nombre}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {TIPO_SENSOR_LABEL[sensor.tipo]}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSensorHistorial(sensor)}
                      className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                      title="Asociación a lote / historial"
                    >
                      <Link2 className="h-4 w-4" />
                    </button>
                    {puedeGestionar && (
                      <button
                        type="button"
                        onClick={() => abrirEdicion(sensor)}
                        className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                        title="Editar sensor"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <SensorEstadoBadge estado={sensor.estado} />
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500">Parámetro</dt>
                    <dd className="text-slate-600 dark:text-slate-400">
                      {PARAMETRO_LABEL[sensor.parametro] ?? sensor.parametro}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400 dark:text-slate-500">Ubicación</dt>
                    <dd className="text-slate-600 dark:text-slate-400">
                      {UBICACION_LABEL[sensor.ubicacion]}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-slate-400 dark:text-slate-500">Rango favorable</dt>
                    <dd className="text-slate-600 dark:text-slate-400">
                      {sensor.rangoMinFavor} – {sensor.rangoMaxFavor}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </>
      )}

      {puedeGestionar && (
        <SensorFormModal
          isOpen={isModalOpen}
          isSubmitting={editingSensor ? isUpdating : isCreating}
          sensor={editingSensor ?? undefined}
          onClose={cerrarModal}
          onSubmit={handleSubmit}
        />
      )}

      <SensorLoteHistorialModal
        isOpen={sensorHistorial !== null}
        sensor={sensorHistorial}
        puedeAsociar={puedeAsociar}
        onClose={() => setSensorHistorial(null)}
      />
    </>
  );
}