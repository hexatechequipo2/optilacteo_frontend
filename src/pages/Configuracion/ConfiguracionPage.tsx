import { useState } from "react";
import { Layout } from "../../components/layout/Layout";
import { Tabs } from "../../components/ui/Tabs";
import { useAuth } from "../../hooks/useAuth";
import { useEmpresaActual } from "../../hooks/useEmpresaActual";
import { LogoIdentidadTab } from "./components/LogoIdentidadTab";
import { UmbralesCalidadTab } from "./components/UmbralesCalidadTab";
import { ComparacionHistoricaConfigTab } from "./components/ComparacionHistoricaConfigTab";

type TabConfiguracion = "umbrales" | "logo-identidad" | "comparacion-historica";

const TABS_GERENTE: { value: TabConfiguracion; label: string }[] = [
  { value: "umbrales", label: "Umbrales de calidad" },
  { value: "logo-identidad", label: "Logo e identidad" },
  { value: "comparacion-historica", label: "Comparación histórica" },
];

// HU-23: a diferencia de Umbrales/Logo (Gerente-only, ver allowedRoles en
// App.tsx), Responsable de calidad tiene acceso de solo lectura a esta
// pestaña puntual (GET /config-parametros/comparacion-historica habilita
// ambos roles en el backend). No le mostramos las otras pestañas para no
// pegarle a endpoints que le devuelven 403.
const TABS_RESPONSABLE_CALIDAD: { value: TabConfiguracion; label: string }[] = [
  { value: "comparacion-historica", label: "Comparación histórica" },
];

export default function ConfiguracionPage() {
  const { user } = useAuth();
  const { empresa } = useEmpresaActual();
  const esGerente = user?.rolNombre === "Gerente";
  const tabs = esGerente ? TABS_GERENTE : TABS_RESPONSABLE_CALIDAD;
  const [tabActiva, setTabActiva] = useState<TabConfiguracion>(
    esGerente ? "logo-identidad" : "comparacion-historica",
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
    </Layout>
  );
}
