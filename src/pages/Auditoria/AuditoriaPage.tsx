import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Layout } from "../../components/layout/Layout";
import { Select } from "../../components/ui/Select";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Badge, type BadgeVariant } from "../../components/ui/Badge";

// HU-43 (Sprint 5, mock visual): "Log de auditoría" para Administrador. A
// pedido explícito de la tarea, sin conexión a backend todavía (no está
// desarrollado para esta fecha) — todas las entradas de acá son datos de
// ejemplo fijos, solo para validar que el visual coincide con el prototipo
// del documento inicial de Sprint 5. El filtrado y la exportación a CSV sí
// son funcionales de verdad, pero 100% client-side sobre este arreglo mock
// (mismo criterio que exportarTrazabilidadCsv.ts): no hay ningún GET/POST
// real todavía. Cuando el backend exponga el endpoint de auditoría
// transversal, esto se reemplaza por un hook real con paginación.

type TipoAccion =
  | "alta"
  | "edicion"
  | "baja"
  | "exportacion"
  | "inicio_sesion"
  | "cierre_sesion"
  | "cambio_umbrales";

interface EntradaAuditoria {
  id: number;
  usuario: string;
  rol: string;
  fecha: string; // YYYY-MM-DD
  hora: string;
  accion: TipoAccion;
  descripcion: string;
  entidadTipo: string;
  entidadId: string | null;
}

const ACCION_META: Record<TipoAccion, { label: string; variant: BadgeVariant }> = {
  alta: { label: "Alta", variant: "success" },
  edicion: { label: "Edición", variant: "info" },
  baja: { label: "Baja", variant: "danger" },
  exportacion: { label: "Exportación", variant: "neutral" },
  inicio_sesion: { label: "Inicio de sesión", variant: "neutral" },
  cierre_sesion: { label: "Cierre de sesión", variant: "neutral" },
  cambio_umbrales: { label: "Cambio de umbrales", variant: "warning" },
};

// Ejemplo fijo, pensado para calzar con el prototipo del documento de
// Sprint 5 y cubrir los 3 tipos de evento que pide el AC1 (sesión, alta/
// edición/baja de registros críticos, cambios de configuración).
const ENTRADAS_MOCK: EntradaAuditoria[] = [
  {
    id: 1,
    usuario: "Paula Ferreyra",
    rol: "Jefe de planta",
    fecha: "2026-09-16",
    hora: "12:27:36 p. m.",
    accion: "edicion",
    descripcion: "Edición de plan Profesional: límite de sensores",
    entidadTipo: "Plan",
    entidadId: "PLA-1552",
  },
  {
    id: 2,
    usuario: "Paula Ferreyra",
    rol: "Jefe de planta",
    fecha: "2026-09-16",
    hora: "07:45:22 a. m.",
    accion: "edicion",
    descripcion: "Edición de lote L-2026-2210: destino reasignado a Cámara de espera",
    entidadTipo: "Lote",
    entidadId: "LOT-3169",
  },
  {
    id: 3,
    usuario: "Paula Ferreyra",
    rol: "Jefe de planta",
    fecha: "2026-09-16",
    hora: "07:24:08 a. m.",
    accion: "exportacion",
    descripcion: "Exportación de predicción de volumen (CSV)",
    entidadTipo: "Reporte",
    entidadId: "REP-7957",
  },
  {
    id: 4,
    usuario: "Hernán Quiroga",
    rol: "Operario",
    fecha: "2026-09-14",
    hora: "09:48:38 a. m.",
    accion: "edicion",
    descripcion: "Edición de plan Enterprise: límite de sensores",
    entidadTipo: "Plan",
    entidadId: "PLA-4517",
  },
  {
    id: 5,
    usuario: "Paula Ferreyra",
    rol: "Jefe de planta",
    fecha: "2026-09-14",
    hora: "08:43:19 a. m.",
    accion: "alta",
    descripcion: "Alta de lote L-2026-2210 en Tanque de almacenamiento",
    entidadTipo: "Lote",
    entidadId: "LOT-3899",
  },
  {
    id: 6,
    usuario: "Hernán Quiroga",
    rol: "Operario",
    fecha: "2026-09-13",
    hora: "07:22:43 p. m.",
    accion: "inicio_sesion",
    descripcion: "Inicio de sesión desde Safari / macOS",
    entidadTipo: "Sesión",
    entidadId: null,
  },
  {
    id: 7,
    usuario: "Hernán Quiroga",
    rol: "Operario",
    fecha: "2026-09-13",
    hora: "07:58:11 p. m.",
    accion: "cierre_sesion",
    descripcion: "Cierre de sesión desde Safari / macOS",
    entidadTipo: "Sesión",
    entidadId: null,
  },
  {
    id: 8,
    usuario: "Lucía Bermúdez",
    rol: "Operario",
    fecha: "2026-09-13",
    hora: "12:35:03 p. m.",
    accion: "baja",
    descripcion: "Baja de plan Básico heredado",
    entidadTipo: "Plan",
    entidadId: "PLA-6467",
  },
  {
    id: 9,
    usuario: "Sistema",
    rol: "Proceso automático",
    fecha: "2026-09-12",
    hora: "11:50:17 a. m.",
    accion: "cambio_umbrales",
    descripcion: "Umbrales de temperatura en crema de leche modificados",
    entidadTipo: "Umbral",
    entidadId: "UMB-2641",
  },
  {
    id: 10,
    usuario: "Marina Duarte",
    rol: "Administrador",
    fecha: "2026-09-12",
    hora: "05:37:08 p. m.",
    accion: "baja",
    descripcion: "Baja de plan Básico heredado",
    entidadTipo: "Plan",
    entidadId: "PLA-7318",
  },
  {
    id: 11,
    usuario: "Diego Sosa",
    rol: "Administrador",
    fecha: "2026-09-12",
    hora: "05:09:44 p. m.",
    accion: "alta",
    descripcion: "Alta de usuario j.moreno@lacteosdelplata.com.ar, Jefe de planta",
    entidadTipo: "Usuario",
    entidadId: null,
  },
  {
    id: 12,
    usuario: "Marina Duarte",
    rol: "Administrador",
    fecha: "2026-09-11",
    hora: "09:14:02 a. m.",
    accion: "inicio_sesion",
    descripcion: "Inicio de sesión desde Chrome / Windows",
    entidadTipo: "Sesión",
    entidadId: null,
  },
];

const TODOS_LOS_USUARIOS = "__todos__";
const TODAS_LAS_ACCIONES = "__todas__";

function celdaCsv(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

function exportarAuditoriaCsv(entradas: EntradaAuditoria[]): void {
  const filas: string[] = [];
  filas.push(
    ["Usuario", "Rol", "Fecha", "Hora", "Acción", "Descripción", "Entidad afectada"]
      .map(celdaCsv)
      .join(","),
  );

  for (const entrada of entradas) {
    filas.push(
      [
        entrada.usuario,
        entrada.rol,
        entrada.fecha,
        entrada.hora,
        ACCION_META[entrada.accion].label,
        entrada.descripcion,
        entrada.entidadId ? `${entrada.entidadTipo} ${entrada.entidadId}` : entrada.entidadTipo,
      ]
        .map(celdaCsv)
        .join(","),
    );
  }

  // BOM al inicio: sin esto, Excel en Windows rompe las tildes/ñ del CSV
  // (mismo criterio que exportarTrazabilidadCsv.ts).
  const contenido = "﻿" + filas.join("\r\n");
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `log-auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AuditoriaPage() {
  const [usuarioFiltro, setUsuarioFiltro] = useState(TODOS_LOS_USUARIOS);
  const [accionFiltro, setAccionFiltro] = useState(TODAS_LAS_ACCIONES);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const usuarioOptions = useMemo(() => {
    const nombres = Array.from(new Set(ENTRADAS_MOCK.map((e) => e.usuario))).sort();
    return [
      { value: TODOS_LOS_USUARIOS, label: "Todos los usuarios" },
      ...nombres.map((nombre) => ({ value: nombre, label: nombre })),
    ];
  }, []);

  const accionOptions = [
    { value: TODAS_LAS_ACCIONES, label: "Todas las acciones" },
    ...(Object.entries(ACCION_META) as [TipoAccion, (typeof ACCION_META)[TipoAccion]][]).map(
      ([value, meta]) => ({ value, label: meta.label }),
    ),
  ];

  const entradasFiltradas = useMemo(() => {
    return ENTRADAS_MOCK.filter((entrada) => {
      if (usuarioFiltro !== TODOS_LOS_USUARIOS && entrada.usuario !== usuarioFiltro) return false;
      if (accionFiltro !== TODAS_LAS_ACCIONES && entrada.accion !== accionFiltro) return false;
      if (desde && entrada.fecha < desde) return false;
      if (hasta && entrada.fecha > hasta) return false;
      return true;
    });
  }, [usuarioFiltro, accionFiltro, desde, hasta]);

  return (
    <Layout breadcrumb="Consola > Auditoría">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Log de auditoría
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {entradasFiltradas.length} entradas registradas
          </p>
        </div>
        <Button
          type="button"
          className="!w-auto gap-2 px-4"
          onClick={() => exportarAuditoriaCsv(entradasFiltradas)}
        >
          <Download className="h-4 w-4" /> Exportar todo (CSV)
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          id="auditoria-usuario"
          label="Usuario"
          options={usuarioOptions}
          value={usuarioFiltro}
          onChange={(e) => setUsuarioFiltro(e.target.value)}
        />
        <Select
          id="auditoria-accion"
          label="Tipo de acción"
          options={accionOptions}
          value={accionFiltro}
          onChange={(e) => setAccionFiltro(e.target.value)}
        />
        <Input
          id="auditoria-desde"
          type="date"
          label="Desde"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
        />
        <Input
          id="auditoria-hasta"
          type="date"
          label="Hasta"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Hora</th>
              <th className="px-4 py-3">Acción</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Entidad afectada</th>
            </tr>
          </thead>
          <tbody>
            {entradasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                  No hay entradas que coincidan con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              entradasFiltradas.map((entrada) => {
                const meta = ACCION_META[entrada.accion];
                return (
                  <tr
                    key={entrada.id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 dark:text-white">
                        {entrada.usuario}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{entrada.rol}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {new Date(`${entrada.fecha}T12:00:00`).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{entrada.hora}</td>
                    <td className="px-4 py-3">
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {entrada.descripcion}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {entrada.entidadId ? `${entrada.entidadTipo} ${entrada.entidadId}` : entrada.entidadTipo}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
