import { useState } from "react";
import { Layout } from "../../components/layout/Layout";
import { Tabs } from "../../components/ui/Tabs";
import { usePermisos } from "../../hooks/usePermisos";
import { useEmpresaActual } from "../../hooks/useEmpresaActual";
import type { ModuloPermiso } from "../../types/permisos.types";
import { LogoIdentidadTab } from "./components/LogoIdentidadTab";
import { UmbralesCalidadTab } from "./components/UmbralesCalidadTab";
import { ComparacionHistoricaConfigTab } from "./components/ComparacionHistoricaConfigTab";
import { PlcGatewayConfigTab } from "./components/PlcGatewayConfigTab";
import { SkusConfigTab } from "./components/SkusConfigTab";
import { DestinosProductivosConfigTab } from "./components/DestinosProductivosConfigTab";
import { HorariosSilencioConfigTab } from "./components/HorariosSilencioConfigTab";
import { RetencionDatosTab } from "./components/RetencionDatosTab";

type TabConfiguracion =
  | "umbrales"
  | "logo-identidad"
  | "comparacion-historica"
  | "plc-gateway"
  | "skus"
  | "destinos-productivos"
  | "horarios-silencio"
  | "retencion-datos";

// Cada pestaña se muestra con `ver` del módulo de sus endpoints; qué se
// puede editar adentro lo decide cada pestaña con usePermisos.
const TABS: { value: TabConfiguracion; label: string; modulo: ModuloPermiso }[] = [
  { value: "logo-identidad", label: "Logo e identidad", modulo: "configuracion_empresa" },
  { value: "umbrales", label: "Umbrales de calidad", modulo: "configuracion_empresa" },
  {
    value: "comparacion-historica",
    label: "Comparación histórica",
    modulo: "configuracion_empresa",
  },
  { value: "plc-gateway", label: "Conexión PLC/Gateway", modulo: "sensores_iot" },
  { value: "skus", label: "Catálogo de SKUs", modulo: "trazabilidad" },
  {
    value: "destinos-productivos",
    label: "Destinos productivos",
    modulo: "destino_productivo_ia",
  },
  { value: "horarios-silencio", label: "Horarios de silencio", modulo: "monitoreo_alertas" },
  { value: "retencion-datos", label: "Retención de datos", modulo: "configuracion_empresa" },
];

export default function ConfiguracionPage() {
  const { puede } = usePermisos();
  const { empresa } = useEmpresaActual();
  const tabs = TABS.filter((t) => puede(t.modulo, "ver"));
  const [tabElegida, setTabElegida] = useState<TabConfiguracion | null>(null);
  const tabActiva = tabElegida ?? tabs[0]?.value;

  return (
    <Layout breadcrumb="Consola > Configuración">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Configuración de la empresa
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Parámetros propios de {empresa?.name ?? "tu empresa"} · visible solo para tu organización
        </p>
      </div>

      <div className="mb-6">
        <Tabs tabs={tabs} value={tabActiva} onChange={setTabElegida} />
      </div>

      {tabActiva === "logo-identidad" && <LogoIdentidadTab />}
      {tabActiva === "umbrales" && <UmbralesCalidadTab />}
      {tabActiva === "comparacion-historica" && <ComparacionHistoricaConfigTab />}
      {tabActiva === "plc-gateway" && <PlcGatewayConfigTab />}
      {tabActiva === "skus" && <SkusConfigTab />}
      {tabActiva === "destinos-productivos" && (
        <DestinosProductivosConfigTab puedeAdministrar={puede("destino_productivo_ia", "crear")} />
      )}
      {tabActiva === "horarios-silencio" && <HorariosSilencioConfigTab />}
      {tabActiva === "retencion-datos" && <RetencionDatosTab />}
    </Layout>
  );
}
