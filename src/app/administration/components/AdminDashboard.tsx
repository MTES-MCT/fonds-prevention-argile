"use client";

import { useState } from "react";
import StatistiquesPanel from "./statistiques/StatistiquesPanel";
import UsersPanel from "./users/UsersPanel";
import AmoPanel from "./amo/AmoPanel";
import EligibilitePanel from "./eligibilite/EligibilitePanel";
import DiagnosticPanel from "./diagnostic/DiagnosticPanel";
import DevisPanel from "./devis/DevisPanel";
import FacturesPanel from "./factures/FacturesPanel";
import type { ActionResult } from "@/shared/types";
import type { DemarcheDetailed, DossiersConnection } from "@/features/parcours/dossiers-ds/adapters/graphql/types";

type TabId = "statistiques" | "users" | "amo" | "eligibilite" | "diagnostic" | "devis" | "factures";

interface DemarcheData {
  demarche: ActionResult<DemarcheDetailed>;
  schema: ActionResult<DemarcheDetailed>;
  dossiers: ActionResult<DossiersConnection>;
}

interface AdminDashboardProps {
  eligibiliteData: DemarcheData;
}

export default function AdminDashboard({ eligibiliteData }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>("statistiques");

  const links = [
    {
      id: "statistiques" as TabId,
      label: "Statistiques",
      icon: "fr-icon-bar-chart-box-fill",
    },
    {
      id: "users" as TabId,
      label: "Utilisateurs",
      icon: "fr-icon-user-fill",
    },
    {
      id: "amo" as TabId,
      label: "Entreprises AMO",
      icon: "fr-icon-building-fill",
    },
    {
      id: "eligibilite" as TabId,
      label: "Eligibilité",
      icon: "fr-icon-questionnaire-fill",
    },
    {
      id: "diagnostic" as TabId,
      label: "Diagnostic",
      icon: "fr-icon-survey-fill",
    },
    {
      id: "devis" as TabId,
      label: "Devis",
      icon: "fr-icon-file-text-fill",
    },
    {
      id: "factures" as TabId,
      label: "Factures",
      icon: "fr-icon-draft-fill",
    },
  ];

  return (
    <>
      {/* Navigation principale avec ombre */}
      <div style={{ boxShadow: "0 8px 16px 0 rgba(0, 0, 0, 0.1)" }}>
        <div className="fr-container">
          <nav className="fr-nav" role="navigation" aria-label="Menu d'administration">
            <ul className="fr-nav__list">
              {links.map((link) => (
                <li key={link.id} className="fr-nav__item">
                  <button
                    type="button"
                    className="fr-nav__link"
                    aria-current={activeTab === link.id ? "page" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveTab(link.id);
                    }}>
                    <span className={`${link.icon} fr-mr-2v`} />
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Contenu des panels */}
      <div className="fr-container fr-mt-6w">
        {/* Panel Statistiques */}
        <div className={activeTab === "statistiques" ? "" : "fr-hidden"} role="region" aria-label="Statistiques">
          <StatistiquesPanel />
        </div>

        {/* Panel Utilisateurs */}
        <div className={activeTab === "users" ? "" : "fr-hidden"} role="region" aria-label="Utilisateurs">
          <UsersPanel />
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
    </>
  );
}
