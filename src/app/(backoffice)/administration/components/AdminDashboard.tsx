"use client";

import { useState } from "react";
import AdminSideMenu from "./shared/AdminSideMenu";
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
import { AllersVersPanel } from "./allers-vers";

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
 */
export default function AdminDashboard({ eligibiliteData }: AdminDashboardProps) {
  const { activeTab } = useAdminTab();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="fr-container-fluid" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="fr-grid-row" style={{ flex: 1 }}>
        {/* Bouton menu mobile - visible uniquement sur mobile */}
        <div
          className="fr-col-12 fr-hidden-lg"
          style={{ padding: "1rem", borderBottom: "1px solid var(--border-default-grey)" }}>
          <button
            className="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-menu-line"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-expanded={isMobileMenuOpen}
            aria-controls="admin-mobile-menu">
            Menu
          </button>
        </div>

        {/* Menu latéral - masqué sur mobile sauf si ouvert */}
        <div
          id="admin-mobile-menu"
          className={`fr-col-12 fr-col-lg-3 fr-col-xl-2 fr-background-default--grey ${
            isMobileMenuOpen ? "" : "fr-hidden fr-unhidden-lg"
          }`}
          style={{
            borderRight: "1px solid var(--border-default-grey)",
          }}>
          <div
            style={{
              position: "sticky",
              top: "0",
              maxHeight: "100vh",
              overflowY: "auto",
            }}>
            <AdminSideMenu />
          </div>
        </div>

        {/* Contenu principal - s'adapte selon la taille d'écran */}
        <div
          className="fr-col-12 fr-col-lg-9 fr-col-xl-10"
          style={{
            backgroundColor: "var(--background-alt-blue-france)",
            minHeight: "calc(100vh - 80px)",
          }}>
          <div className="fr-py-6w fr-px-2w fr-px-md-6w">
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

            {/* Panel Allers Vers */}
            <div className={activeTab === "allers-vers" ? "" : "fr-hidden"} role="region" aria-label="Allers Vers">
              <AllersVersPanel />
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
