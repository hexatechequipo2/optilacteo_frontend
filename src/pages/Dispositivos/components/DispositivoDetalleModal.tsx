import { Modal } from "../../../components/ui/Modal";
import { Badge } from "../../../components/ui/Badge";
import { SectionHeader } from "../../../components/ui/SectionHeader";
import {
  CATEGORIA_META,
  ESTADO_META,
  FORMA_CONEXION_LABEL,
  TIPO_SENAL_LABEL,
  type Dispositivo,
} from "../constants/dispositivos";

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{valor}</p>
    </div>
  );
}

function formatFecha(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("es-AR");
}

interface DispositivoDetalleModalProps {
  isOpen: boolean;
  dispositivo: Dispositivo | null;
  onClose: () => void;
}

// HU-71 (AC3): los actuadores figuran únicamente como inventario, sin
// ninguna acción de comando — esta ficha de solo lectura es a propósito la
// única interacción disponible para ellos además de "Editar".
export function DispositivoDetalleModal({ isOpen, dispositivo, onClose }: DispositivoDetalleModalProps) {
  if (!isOpen || !dispositivo) return null;

  const estadoMeta = ESTADO_META[dispositivo.estado];

  return (
    <Modal
      isOpen={isOpen}
      title={dispositivo.nombre}
      description={`${dispositivo.codigo} · ${dispositivo.numeroSerie}`}
      onClose={onClose}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={estadoMeta.variant}>{estadoMeta.label}</Badge>
          <Badge variant="neutral">{CATEGORIA_META[dispositivo.categoria].label}</Badge>
          {dispositivo.bajaLogica && <Badge variant="danger">Dado de baja</Badge>}
          {dispositivo.categoria === "actuador" && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              Sin acciones de comando disponibles desde la plataforma.
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <SectionHeader>IDENTIFICACIÓN</SectionHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Campo label="Marca" valor={dispositivo.marca} />
            <Campo label="Modelo" valor={dispositivo.modelo} />
            <Campo label="Equipo" valor={dispositivo.equipo} />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <SectionHeader>UBICACIÓN Y CONEXIÓN</SectionHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Campo label="Ubicación en planta" valor={dispositivo.ubicacionPlanta} />
            <Campo label="Forma de conexión" valor={FORMA_CONEXION_LABEL[dispositivo.formaConexion]} />
            <Campo
              label="Origen del dato"
              valor={dispositivo.conexionPosible ? "Conexión directa posible" : "Carga manual"}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <SectionHeader>SEÑAL Y CALIBRACIÓN</SectionHeader>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Campo label="Tipo de señal" valor={TIPO_SENAL_LABEL[dispositivo.tipoSenal]} />
            <Campo label="Alimentación" valor={dispositivo.alimentacion || "—"} />
            <Campo
              label="Rango"
              valor={`${dispositivo.rangoMin} a ${dispositivo.rangoMax} ${dispositivo.unidad}`}
            />
            <Campo label="Fecha de calibración" valor={formatFecha(dispositivo.fechaCalibracion)} />
            <Campo
              label="Último dato"
              valor={
                dispositivo.ultimoDato
                  ? new Date(dispositivo.ultimoDato).toLocaleString("es-AR")
                  : "Sin reportes"
              }
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
