import { Modal } from "./ui/Modal";
import type { AuditoriaUsuario, TrazabilidadEntidad } from "../types/auditoria.types";

interface AuditoriaModalProps {
  isOpen: boolean;
  // Título del modal, ej. `Auditoría — ${lote.codigo}`. Genérico a propósito:
  // este componente no depende de Lote ni de ningún módulo en particular,
  // se reutiliza igual para proveedores/sensores/config-parametros (HU-63).
  titulo: string;
  auditoria: TrazabilidadEntidad | null | undefined;
  onClose: () => void;
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EventoAuditoria({ usuario }: { usuario: AuditoriaUsuario }) {
  return (
    <p className="text-sm text-slate-700 dark:text-slate-300">
      <span className="font-medium text-slate-900 dark:text-white">{usuario.userEmail}</span>{" "}
      · {formatFecha(usuario.fecha)}
    </p>
  );
}

export function AuditoriaModal({ isOpen, titulo, auditoria, onClose }: AuditoriaModalProps) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} title={titulo} description="Historial de creación y modificación de este registro." onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Creado por
          </h3>
          <div className="mt-1">
            {auditoria?.creadoPor ? (
              <EventoAuditoria usuario={auditoria.creadoPor} />
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Sin datos de creación disponibles.
              </p>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Última modificación
          </h3>
          <div className="mt-1">
            {auditoria?.ultimaModificacion ? (
              <EventoAuditoria usuario={auditoria.ultimaModificacion} />
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Sin modificaciones posteriores.
              </p>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
