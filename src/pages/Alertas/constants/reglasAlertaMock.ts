import type { DestinatarioAlerta, NivelAlerta, ReglaAlerta } from "../../../types/destinatarioAlerta.types";

// HU-29: todavía no hay endpoint de reglas/destinatarios de alertas — mock
// data para dejar la pantalla armada y lista para conectar al back (ver
// entregable de la HU). Coincide con la Figura 3 del doc de Sprint 3.
export const NIVEL_ALERTA_LABEL: Record<NivelAlerta, string> = {
  critica: "Crítica",
  preventiva: "Preventiva",
  informativa: "Informativa",
};

export const MOCK_USUARIOS_DISPONIBLES: DestinatarioAlerta[] = [
  { id: "u1", nombre: "J. Rinaldi", rol: "Resp. de Calidad" },
  { id: "u2", nombre: "P. Ferreyra", rol: "Supervisor de Planta" },
  { id: "u3", nombre: "C. Dominguez", rol: "Operario de Línea" },
  { id: "u4", nombre: "M. Torres", rol: "Gerente" },
  { id: "u5", nombre: "L. Gómez", rol: "Operario de Línea" },
];

export const MOCK_REGLAS_ALERTA: ReglaAlerta[] = [
  {
    id: "r1",
    nombre: "Cámara fría — temp > 6°C",
    nivel: "critica",
    destinatarios: [MOCK_USUARIOS_DISPONIBLES[0], MOCK_USUARIOS_DISPONIBLES[1]],
  },
  {
    id: "r2",
    nombre: "pH leche cruda fuera 6.6–6.8",
    nivel: "preventiva",
    destinatarios: [MOCK_USUARIOS_DISPONIBLES[0]],
  },
  {
    id: "r3",
    nombre: "Pasteurización < 72°C / > 75°C",
    nivel: "critica",
    destinatarios: [MOCK_USUARIOS_DISPONIBLES[2], MOCK_USUARIOS_DISPONIBLES[1]],
  },
  {
    id: "r4",
    nombre: "Pérdida de señal sensor > 30 s",
    nivel: "preventiva",
    destinatarios: [],
  },
];
