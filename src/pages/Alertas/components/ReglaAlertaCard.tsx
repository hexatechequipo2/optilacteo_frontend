import { useState } from "react";
import { Combobox } from "../../../components/ui/Combobox";
import { NivelAlertaBadge } from "./NivelAlertaBadge";
import { MOCK_USUARIOS_DISPONIBLES } from "../constants/reglasAlertaMock";
import type { DestinatarioAlerta, ReglaAlerta } from "../../../types/destinatarioAlerta.types";

interface ReglaAlertaCardProps {
  regla: ReglaAlerta;
  onAgregarDestinatario: (reglaId: string, destinatario: DestinatarioAlerta) => void;
}

function destinatarioLabel(d: DestinatarioAlerta): string {
  return `${d.nombre} — ${d.rol}`;
}

export function ReglaAlertaCard({ regla, onAgregarDestinatario }: ReglaAlertaCardProps) {
  const [mostrarSelector, setMostrarSelector] = useState(false);

  const idsAsignados = new Set(regla.destinatarios.map((d) => d.id));
  const opciones = MOCK_USUARIOS_DISPONIBLES.filter((u) => !idsAsignados.has(u.id)).map(destinatarioLabel);

  const handleSeleccionar = (label: string) => {
    const usuario = MOCK_USUARIOS_DISPONIBLES.find((u) => destinatarioLabel(u) === label);
    if (!usuario) return;
    onAgregarDestinatario(regla.id, usuario);
    setMostrarSelector(false);
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="font-semibold text-slate-900 dark:text-white">{regla.nombre}</h3>

      <div className="w-fit">
        <NivelAlertaBadge nivel={regla.nivel} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {regla.destinatarios.map((d) => (
          <span
            key={d.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            {d.nombre} <span className="text-slate-400 dark:text-slate-500">· {d.rol}</span>
          </span>
        ))}

        {mostrarSelector ? (
          <div className="w-64">
            <Combobox
              placeholder="Buscar usuario..."
              value=""
              onChange={handleSeleccionar}
              options={opciones}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMostrarSelector(true)}
            disabled={opciones.length === 0}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-500 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
          >
            + Agregar destinatario
          </button>
        )}
      </div>
    </div>
  );
}
