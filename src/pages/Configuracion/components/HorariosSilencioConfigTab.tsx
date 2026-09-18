import { useMemo, useState } from "react";
import { Moon, Bell, Clock, Pencil, X, AlertTriangle } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Toggle } from "../../../components/ui/Toggle";
import { ConfirmModal } from "../../../components/ui/ConfirmModal";
import { useHorariosSilencio } from "../../../hooks/useHorariosSilencio";
import { calcularSolapamientos } from "../../../utils/solapamientoHorarioSilencio";
import {
  DIAS_SEMANA,
  type HorarioSilencio,
  type HorarioSilencioInput,
} from "../../../types/horarioSilencio.types";
import { HorarioSilencioFormModal } from "./HorarioSilencioFormModal";

function cruzaMedianoche(horario: HorarioSilencio): boolean {
  return horario.horaFin <= horario.horaInicio;
}

function etiquetaDias(dias: HorarioSilencio["dias"]): string {
  if (dias.length === 7) return "Todos los días";
  const finde = new Set(["sab", "dom"]);
  if (dias.length === 2 && dias.every((d) => finde.has(d))) return "Sáb y Dom";
  return dias
    .map((d) => DIAS_SEMANA.find((ds) => ds.value === d)?.label ?? d)
    .join(" ");
}

// HU-30 (Sprint 4, mock visual): pantalla de administración de horarios de
// silencio (AC1). Ver horarioSilencio.types.ts para el detalle de qué es
// mock y qué se espera del backend cuando exista.
export function HorariosSilencioConfigTab() {
  const { horarios, crear, editar, eliminar, toggleActivo } = useHorariosSilencio();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [horarioEditando, setHorarioEditando] = useState<HorarioSilencio | null>(null);
  const [horarioAEliminar, setHorarioAEliminar] = useState<HorarioSilencio | null>(null);

  const solapamientos = useMemo(() => calcularSolapamientos(horarios), [horarios]);
  const activos = horarios.filter((h) => h.activo).length;

  const abrirNuevo = () => {
    setHorarioEditando(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (horario: HorarioSilencio) => {
    setHorarioEditando(horario);
    setModalAbierto(true);
  };

  const handleGuardar = (datos: HorarioSilencioInput) => {
    if (horarioEditando) {
      editar(horarioEditando.id, datos);
    } else {
      crear(datos);
    }
    setModalAbierto(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#3d6fcf] text-white">
              <Moon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Horarios de silencio
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Ventanas horarias en las que no se notifican alertas informativas. Podés
                configurar varias en simultáneo.
              </p>
            </div>
          </div>
          <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">
            {activos} de {horarios.length} activos
          </span>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-500/10">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3d6fcf] text-white">
          <Bell className="h-4 w-4" />
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          <span className="font-semibold">
            El silencio aplica únicamente a alertas informativas.
          </span>{" "}
          Las alertas <span className="font-semibold">críticas</span> y de{" "}
          <span className="font-semibold">advertencia</span> nunca se silencian: se
          notifican siempre, incluso dentro de estas ventanas.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Horarios configurados
          </h3>
          <Button onClick={abrirNuevo} className="!w-auto px-4">
            + Nuevo horario de silencio
          </Button>
        </div>

        {horarios.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Todavía no hay horarios de silencio configurados.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {horarios.map((horario) => {
              const superpuestoCon = solapamientos.get(horario.id);
              return (
                <li
                  key={horario.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#3d6fcf] dark:bg-blue-500/15">
                      <Moon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {horario.nombre}
                        </span>
                        {cruzaMedianoche(horario) && (
                          <Badge variant="neutral">CRUZA MEDIANOCHE</Badge>
                        )}
                        {superpuestoCon && (
                          <span
                            title={`Se superpone con: ${superpuestoCon.join(", ")}`}
                            className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            Se superpone
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {horario.horaInicio} - {horario.horaFin}
                          {cruzaMedianoche(horario) && " (día siguiente)"}
                        </span>
                        <span>{etiquetaDias(horario.dias)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant={horario.activo ? "success" : "neutral"}>
                      {horario.activo ? "Activo" : "Inactivo"}
                    </Badge>
                    <Toggle
                      checked={horario.activo}
                      onChange={() => toggleActivo(horario.id)}
                    />
                    <button
                      type="button"
                      onClick={() => abrirEdicion(horario)}
                      title="Editar"
                      className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setHorarioAEliminar(horario)}
                      title="Eliminar"
                      className="rounded-md border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <HorarioSilencioFormModal
        isOpen={modalAbierto}
        horarioEditando={horarioEditando}
        onGuardar={handleGuardar}
        onClose={() => setModalAbierto(false)}
      />

      <ConfirmModal
        isOpen={horarioAEliminar != null}
        title="Eliminar horario de silencio"
        description={
          horarioAEliminar
            ? `Se va a eliminar "${horarioAEliminar.nombre}". Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => {
          if (horarioAEliminar) eliminar(horarioAEliminar.id);
          setHorarioAEliminar(null);
        }}
        onCancel={() => setHorarioAEliminar(null)}
      />
    </div>
  );
}
