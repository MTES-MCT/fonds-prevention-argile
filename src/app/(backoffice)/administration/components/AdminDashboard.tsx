"use client";

import AdminSideMenu from "./shared/AdminSideMenu";
import Footer from "@/shared/components/Footer/Footer";
import StatistiquesPanel from "./statistiques/StatistiquesPanel";
import AmoPanel from "./amo/AmoPanel";
import EligibilitePanel from "./eligibilite/EligibilitePanel";
import DiagnosticPanel from "./diagnostic/DiagnosticPanel";
import DevisPanel from "./devis/DevisPanel";
import FacturesPanel from "./factures/FacturesPanel";
import UsersTrackingPanel from "./users/UsersTrackingPanel";
import AgentsPanel from "./agents/AgentsPanel";
import { useAdminTab } from "@/features/backoffice";
import type { ActionResult } from "@/shared/types";
import type { DemarcheDetailed, DossiersConnection } from "@/features/parcours/dossiers-ds/adapters/graphql/types";

interface DemarcheData {
  demarche: ActionResult<DemarcheDetailed>;
  schema: ActionResult<DemarcheDetailed>;
  dossiers: ActionResult<DossiersConnection>;
}

interface AdminDashboardProps {
  eligibiliteData: DemarcheData;
}

/**
 * Dashboard principal de l'administration
 *
 */
export default function AdminDashboard({ eligibiliteData }: AdminDashboardProps) {
  const { activeTab } = useAdminTab();

  return (
    <div className="fr-container-fluid" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="fr-grid-row bg-(--background-alt-blue-france)" style={{ flex: 1 }}>
        {/* Menu latéral - sticky avec séparateur sur toute la hauteur */}
        <div
          className="fr-col-12 fr-col-md-3 fr-col-lg-2 fr-background-default--grey"
          style={{
            minWidth: "250px",
            maxWidth: "280px",
            borderRight: "1px solid var(--border-default-grey)",
          }}>
          <div style={{ position: "sticky", top: "0", height: "100vh", overflowY: "auto" }}>
            <AdminSideMenu />
          </div>
        </div>

        {/* Contenu principal - pleine largeur restante */}
        <div className="fr-col-12 fr-col-md-9 fr-col-lg-10 bg-(--background-alt-blue-france)" style={{ flex: 1 }}>
          <div className="fr-py-6w p-12">
            {/* Panel Statistiques */}
            <div className={activeTab === "statistiques" ? "" : "fr-hidden"} role="region" aria-label="Statistiques">
              <StatistiquesPanel />
            </div>

            {/* Panel Utilisateurs */}
            <div className={activeTab === "users" ? "" : "fr-hidden"} role="region" aria-label="Utilisateurs">
              <UsersTrackingPanel />
            </div>

            {/* Panel Agents */}
            <div className={activeTab === "agents" ? "" : "fr-hidden"} role="region" aria-label="Gestion des agents">
              <AgentsPanel />
            </div>

            {/* Panel Entreprises AMO */}
            <div className={activeTab === "amo" ? "" : "fr-hidden"} role="region" aria-label="Entreprises AMO">
              <AmoPanel />
            </div>

            {/* Panel Eligibilite */}
            <div className={activeTab === "eligibilite" ? "" : "fr-hidden"} role="region" aria-label="Eligibilité">
              <EligibilitePanel
                demarcheResponse={eligibiliteData.demarche}
                schemaResponse={eligibiliteData.schema}
                dossiersResponse={eligibiliteData.dossiers}
              />
            </div>

            {/* Panel Diagnostic */}
            <div className={activeTab === "diagnostic" ? "" : "fr-hidden"} role="region" aria-label="Diagnostic">
              <DiagnosticPanel />
            </div>

            {/* Panel Devis */}
            <div className={activeTab === "devis" ? "" : "fr-hidden"} role="region" aria-label="Devis">
              <DevisPanel />
            </div>

            {/* Panel Factures */}
            <div className={activeTab === "factures" ? "" : "fr-hidden"} role="region" aria-label="Factures">
              <FacturesPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
