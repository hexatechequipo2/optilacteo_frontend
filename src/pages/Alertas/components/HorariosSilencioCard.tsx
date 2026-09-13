import { useState } from "react";
import { Moon, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { ConfirmModal } from "../../../components/ui/ConfirmModal";
import { HorarioSilencioModal } from "./HorarioSilencioModal";
import { useConfiguracionSilencioAlerta } from "../../../hooks/useConfiguracionSilencioAlerta";
import { extraerMensajeError } from "../../../services/notificacion.service";
import { DIAS_SEMANA } from "../constants/alertas.constants";
import type {
  ConfiguracionSilencioAlerta,
  CreateConfiguracionSilencioAlertaDto,
} from "../../../types/configuracionSilencioAlerta.types";

function formatDias(diasSemana: number[] | null): string {
  if (!diasSemana || diasSemana.length === 0) return "Todos los días";
  return diasSemana
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DIAS_SEMANA.find((dia) => dia.value === d)?.abreviado ?? "?")
    .join(", ");
}

// HU-30: horarios en los que las alertas informativas no se notifican en
// tiempo real (se siguen registrando en el historial). Mismo criterio
// visual que el resto de las cards de esta página (NivelDestinatariosCard,
// UmbralDesconexionCard): card blanca, borde suave. A diferencia de esas
// dos, esta también la puede administrar Responsable de producción (ver
// gating en DestinatariosAlertasPage.tsx).
export function HorariosSilencioCard() {
  const {
    horarios,
    isLoading,
    error,
    crear,
    editar,
    eliminar,
    isCreating,
    isUpdating,
    eliminandoId,
  } = useConfiguracionSilencioAlerta();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [horarioEditando, setHorarioEditando] = useState<ConfiguracionSilencioAlerta | null>(null);
  const [horarioABorrar, setHorarioABorrar] = useState<ConfiguracionSilencioAlerta | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const abrirAlta = () => {
    setHorarioEditando(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (horario: ConfiguracionSilencioAlerta) => {
    setHorarioEditando(horario);
    setModalAbierto(true);
  };

  const handleSubmit = (dto: CreateConfiguracionSilencioAlertaDto) =>
    horarioEditando ? editar(horarioEditando.id, dto) : crear(dto);

  const confirmarBorrado = async () => {
    if (!horarioABorrar) return;
    setDeleteError(null);
    try {
      await eliminar(horarioABorrar.id);
      setHorarioABorrar(null);
    } catch (err) {
      setDeleteError(extraerMensajeError(err, "No se pudo eliminar el horario. Intentá nuevamente."));
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Moon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Horarios de silencio
          </h2>
        </div>
        <button
          type="button"
          onClick={abrirAlta}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
        >
          <Plus className="h-3.5 w-3.5" />
          Nuevo horario
        </button>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        En estos horarios, las alertas informativas no se notifican en tiempo real (se siguen
        registrando en el historial). Las alertas de advertencia y críticas nunca se silencian.
      </p>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-400">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">Cargando...</p>
      ) : horarios.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Todavía no hay horarios de silencio configurados.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
          {horarios.map((horario) => (
            <div
              key={horario.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {horario.nombre ?? `Horario #${horario.id}`}
                </span>
                <Badge variant="neutral">
                  {horario.horaInicio} - {horario.horaFin}
                </Badge>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDias(horario.diasSemana)}
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => abrirEdicion(horario)}
                  className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                  title="Editar horario"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(null);
                    setHorarioABorrar(horario);
                  }}
                  className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 hover:text-red-600 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-red-400"
                  title="Eliminar horario"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <HorarioSilencioModal
        isOpen={modalAbierto}
        isSubmitting={horarioEditando ? isUpdating : isCreating}
        horario={horarioEditando ?? undefined}
        onClose={() => setModalAbierto(false)}
        onSubmit={handleSubmit}
      />

      <ConfirmModal
        isOpen={horarioABorrar !== null}
        title="¿Eliminar este horario de silencio?"
        description={
          deleteError ??
          `Las alertas informativas van a volver a notificarse en este horario${
            horarioABorrar?.nombre ? ` ("${horarioABorrar.nombre}")` : ""
          }.`
        }
        confirmLabel="Eliminar"
        variant="danger"
        isLoading={eliminandoId === horarioABorrar?.id}
        onConfirm={confirmarBorrado}
        onCancel={() => setHorarioABorrar(null)}
      />
    </div>
  );
}
