import { useState } from "react";
import { Layout } from "../../components/layout/Layout";
import { Tabs } from "../../components/ui/Tabs";
import { useAuth } from "../../hooks/useAuth";
import { useEmpresaActual } from "../../hooks/useEmpresaActual";
import { LogoIdentidadTab } from "./components/LogoIdentidadTab";
import { UmbralesCalidadTab } from "./components/UmbralesCalidadTab";
import { ComparacionHistoricaConfigTab } from "./components/ComparacionHistoricaConfigTab";
import { PlcGatewayConfigTab } from "./components/PlcGatewayConfigTab";
import { SkusConfigTab } from "./components/SkusConfigTab";

type TabConfiguracion =
  | "umbrales"
  | "logo-identidad"
  | "comparacion-historica"
  | "plc-gateway"
  | "skus";

// HU-67 (AC 2): tab de catálogo de SKUs, solo para Gerente. POST /skus en el
// backend está restringido a ADMINISTRADOR/GERENTE (ver sku.controller.ts),
// pero Administrador no tiene acceso a esta ruta /configuracion en el
// frontend hoy (allowedRoles en App.tsx no lo incluye) — gap preexistente,
// no introducido ni resuelto por esta HU.
const TABS_GERENTE: { value: TabConfiguracion; label: string }[] = [
  { value: "umbrales", label: "Umbrales de calidad" },
  { value: "logo-identidad", label: "Logo e identidad" },
  { value: "comparacion-historica", label: "Comparación histórica" },
  { value: "plc-gateway", label: "Conexión PLC/Gateway" },
  { value: "skus", label: "Catálogo de SKUs" },
];

// HU-23: a diferencia de Umbrales/Logo (Gerente-only, ver allowedRoles en
// App.tsx), Responsable de calidad tiene acceso de solo lectura a esta
// pestaña puntual (GET /config-parametros/comparacion-historica habilita
// ambos roles en el backend). No le mostramos las otras pestañas para no
// pegarle a endpoints que le devuelven 403.
const TABS_RESPONSABLE_CALIDAD: { value: TabConfiguracion; label: string }[] = [
  { value: "comparacion-historica", label: "Comparación histórica" },
];

// HU-61: conectado al backend real (ver plcConfig.service.ts), exclusiva de
// Responsable de producción además de Gerente. No comparte ninguna otra
// pestaña de acá: Operario de línea y Responsable de calidad no llegan a ver
// esta tab.
const TABS_RESPONSABLE_PRODUCCION: { value: TabConfiguracion; label: string }[] = [
  { value: "plc-gateway", label: "Conexión PLC/Gateway" },
];

export default function ConfiguracionPage() {
  const { user } = useAuth();
  const { empresa } = useEmpresaActual();
  const esGerente = user?.rolNombre === "Gerente";
  const esResponsableProduccion = user?.rolNombre === "Responsable de producción";
  const tabs = esGerente
    ? TABS_GERENTE
    : esResponsableProduccion
      ? TABS_RESPONSABLE_PRODUCCION
      : TABS_RESPONSABLE_CALIDAD;
  const [tabActiva, setTabActiva] = useState<TabConfiguracion>(
    esGerente ? "logo-identidad" : esResponsableProduccion ? "plc-gateway" : "comparacion-historica",
  );

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
        <Tabs tabs={tabs} value={tabActiva} onChange={setTabActiva} />
      </div>

      {tabActiva === "logo-identidad" && <LogoIdentidadTab />}
      {tabActiva === "umbrales" && <UmbralesCalidadTab />}
      {tabActiva === "comparacion-historica" && <ComparacionHistoricaConfigTab />}
      {tabActiva === "plc-gateway" && <PlcGatewayConfigTab />}
      {tabActiva === "skus" && <SkusConfigTab />}
    </Layout>
  );
}
