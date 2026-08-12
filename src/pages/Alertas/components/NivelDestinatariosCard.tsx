import { useState } from "react";
import { X } from "lucide-react";
import { Badge } from "../../../components/ui/Badge";
import { Select } from "../../../components/ui/Select";
import { NIVEL_ALERTA_META } from "../constants/alertas.constants";
import type { ConfiguracionNotificacionNivel } from "../../../types/configuracionNotificacion.types";
import type { NivelAlerta } from "../../../types/notificacion.types";
import type { RolType } from "../../../types/rol.types";

interface NivelDestinatariosCardProps {
  nivel: NivelAlerta;
  // Ya filtradas por este nivel — la página agrupa antes de pasarlas.
  configuraciones: ConfiguracionNotificacionNivel[];
  // Roles que todavía no están asignados a este nivel.
  rolesDisponibles: RolType[];
  onAgregarRol: (rol: RolType) => Promise<void>;
  onQuitarRol: (id: number) => Promise<void>;
}

// HU-26: reemplaza ReglaAlertaCard (mock de "reglas" con destinatarios
// individuales). El backend real no tiene reglas nombradas ni usuarios
// sueltos por regla: cada nivel de alerta (informativa/advertencia/critica)
// se configura con los roles que lo reciben (ConfiguracionNotificacionNivel).
export function NivelDestinatariosCard({
  nivel,
  configuraciones,
  rolesDisponibles,
  onAgregarRol,
  onQuitarRol,
}: NivelDestinatariosCardProps) {
  const [mostrarSelector, setMostrarSelector] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const meta = NIVEL_ALERTA_META[nivel];

  const handleSeleccionar = async (rolId: number) => {
    const rol = rolesDisponibles.find((r) => r.id === rolId);
    if (!rol) return;

    setIsSaving(true);
    try {
      await onAgregarRol(rol);
      setMostrarSelector(false);
    } catch {
      // El error ya queda reflejado en el banner de la página — acá solo
      // dejamos el selector abierto para que se pueda reintentar.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="w-fit">
        <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {configuraciones.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1.5 pl-3 pr-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {c.rol?.nombre ?? "Rol"}
            <button
              type="button"
              onClick={() => onQuitarRol(c.id)}
              aria-label={`Quitar ${c.rol?.nombre ?? "rol"} de ${meta.label}`}
              className="rounded-full p-0.5 text-slate-400 transition hover:bg-slate-200 hover:text-red-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-red-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}

        {configuraciones.length === 0 && !mostrarSelector && (
          <span className="text-sm text-slate-400 dark:text-slate-500">
            Nadie configurado — este nivel no notifica a nadie.
          </span>
        )}

        {mostrarSelector ? (
          <div className="w-56">
            <Select
              autoFocus
              disabled={isSaving}
              defaultValue=""
              onChange={(e) => {
                const { value } = e.target;
                if (value) void handleSeleccionar(Number(value));
              }}
              options={[
                { value: "", label: "Seleccioná un rol..." },
                ...rolesDisponibles.map((r) => ({ value: String(r.id), label: r.nombre })),
              ]}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMostrarSelector(true)}
            disabled={rolesDisponibles.length === 0}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
          >
            + Agregar rol
          </button>
        )}
      </div>
    </div>
  );
}
