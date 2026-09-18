import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { FieldError } from "../../../components/ui/FieldError";
import {
  DIAS_SEMANA,
  type DiaSemana,
  type HorarioSilencio,
  type HorarioSilencioInput,
} from "../../../types/horarioSilencio.types";

interface HorarioSilencioFormModalProps {
  isOpen: boolean;
  horarioEditando: HorarioSilencio | null;
  onGuardar: (datos: HorarioSilencioInput) => void;
  onClose: () => void;
}

interface FormState {
  nombre: string;
  horaInicio: string;
  horaFin: string;
  dias: DiaSemana[];
}

const ESTADO_VACIO: FormState = {
  nombre: "",
  horaInicio: "",
  horaFin: "",
  dias: [],
};

export function HorarioSilencioFormModal({
  isOpen,
  horarioEditando,
  onGuardar,
  onClose,
}: HorarioSilencioFormModalProps) {
  const [form, setForm] = useState<FormState>(ESTADO_VACIO);
  const [errores, setErrores] = useState<Partial<Record<keyof FormState, string>>>({});

  // Recargar el form cada vez que se abre (alta -> vacío, edición -> datos
  // del horario) en vez de derivarlo directo de la prop, para no pisar lo
  // que el usuario está tipeando si horarioEditando cambia de referencia.
  useEffect(() => {
    if (!isOpen) return;
    setErrores({});
    setForm(
      horarioEditando
        ? {
            nombre: horarioEditando.nombre,
            horaInicio: horarioEditando.horaInicio,
            horaFin: horarioEditando.horaFin,
            dias: horarioEditando.dias,
          }
        : ESTADO_VACIO,
    );
  }, [isOpen, horarioEditando]);

  const toggleDia = (dia: DiaSemana) => {
    setForm((prev) => ({
      ...prev,
      dias: prev.dias.includes(dia)
        ? prev.dias.filter((d) => d !== dia)
        : [...prev.dias, dia],
    }));
  };

  const validar = (): boolean => {
    const nuevosErrores: Partial<Record<keyof FormState, string>> = {};
    if (!form.nombre.trim()) {
      nuevosErrores.nombre = "El nombre es obligatorio.";
    }
    if (!form.horaInicio || !form.horaFin) {
      nuevosErrores.horaFin = "Elegí hora de inicio y de fin.";
    } else if (form.horaInicio === form.horaFin) {
      // Ventana de 0 minutos. Para "todo el día" el patrón es 13:00-23:59,
      // no 00:00-00:00 (que acá quedaría bloqueado como horas iguales).
      nuevosErrores.horaFin =
        "La hora de fin no puede ser igual a la de inicio.";
    }
    if (form.dias.length === 0) {
      nuevosErrores.dias = "Elegí al menos un día.";
    }
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validar()) return;
    onGuardar({
      nombre: form.nombre.trim(),
      horaInicio: form.horaInicio,
      horaFin: form.horaFin,
      dias: form.dias,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={horarioEditando ? "Editar horario de silencio" : "Nuevo horario de silencio"}
      description="Ventana horaria en la que no se notifican alertas informativas."
      footer={
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <Button type="submit" form="form-horario-silencio" className="!w-auto px-6">
            Guardar
          </Button>
        </div>
      }
    >
      <form
        id="form-horario-silencio"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        <Input
          id="horario-silencio-nombre"
          label="Nombre"
          placeholder="Ej: Turno noche"
          value={form.nombre}
          onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
          error={errores.nombre}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="horario-silencio-inicio"
            label="Hora de inicio"
            type="time"
            value={form.horaInicio}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, horaInicio: e.target.value }))
            }
          />
          <Input
            id="horario-silencio-fin"
            label="Hora de fin"
            type="time"
            value={form.horaFin}
            onChange={(e) => setForm((prev) => ({ ...prev, horaFin: e.target.value }))}
            error={errores.horaFin}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Días
          </span>
          <div className="flex gap-1.5">
            {DIAS_SEMANA.map(({ value, label }) => {
              const seleccionado = form.dias.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={seleccionado}
                  title={value}
                  onClick={() => toggleDia(value)}
                  className={`h-9 w-9 rounded-full text-sm font-semibold transition ${
                    seleccionado
                      ? "bg-[#3d6fcf] text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {errores.dias && <FieldError message={errores.dias} />}
        </div>
      </form>
    </Modal>
  );
}
