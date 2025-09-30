"use client";

import { useState } from "react";
import type {
  DemarcheDetailed,
  DossiersConnection,
} from "@/lib/api/demarches-simplifiees/graphql/types";
import DemarcheInfo from "./DemarcheInfo";
import DemarcheSchema from "./DemarcheSchema";
import DossiersList from "./DossiersList";
import EmailNotificationsList from "./EmailNotificationsList";

interface AdminDashboardProps {
  demarche: DemarcheDetailed;
  dossiersConnection: DossiersConnection | null;
  schema: DemarcheDetailed | null;
}

type TabId = "early-access" | "demarche-info" | "dossiers";

export default function AdminDashboard({
  demarche,
  dossiersConnection,
  schema,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>("early-access");

  const tabs = [
    {
      id: "early-access" as TabId,
      label: "Accès anticipés",
      icon: "fr-icon-mail-line",
    },
    {
      id: "demarche-info" as TabId,
      label: "Infos démarche",
      icon: "fr-icon-information-line",
    },
    {
      id: "dossiers" as TabId,
      label: "Dossiers",
      icon: "fr-icon-file-text-line",
    },
  ];

  return (
    <div className="fr-container fr-py-6w">
      <h1 className="fr-h2 fr-mb-4w">Administration - Fonds de Prévention</h1>

      <div className="fr-tabs">
        <ul
          className="fr-tabs__list"
          role="tablist"
          aria-label="Onglets d'administration"
        >
          {tabs.map((tab) => (
            <li key={tab.id} role="presentation">
              <button
                type="button"
                id={`tab-${tab.id}`}
                className={`fr-tabs__tab ${tab.icon} fr-tabs__tab--icon-left`}
                tabIndex={activeTab === tab.id ? 0 : -1}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Panel Accès anticipés */}
        <div
          id="panel-early-access"
          className={`fr-tabs__panel ${activeTab === "early-access" ? "fr-tabs__panel--selected" : ""}`}
          role="tabpanel"
          aria-labelledby="tab-early-access"
          tabIndex={0}
        >
          <h2 className="fr-h3 fr-mb-3w">Inscriptions accès anticipés</h2>
          <EmailNotificationsList />
        </div>

        {/* Panel Infos démarche */}
        <div
          id="panel-demarche-info"
          className={`fr-tabs__panel ${activeTab === "demarche-info" ? "fr-tabs__panel--selected" : ""}`}
          role="tabpanel"
          aria-labelledby="tab-demarche-info"
          tabIndex={0}
        >
          <DemarcheInfo demarche={demarche} />
          <div className="fr-mt-6w">
            <DemarcheSchema
              champDescriptors={schema?.activeRevision?.champDescriptors}
            />
          </div>
        </div>

        {/* Panel Dossiers */}
        <div
          id="panel-dossiers"
          className={`fr-tabs__panel ${activeTab === "dossiers" ? "fr-tabs__panel--selected" : ""}`}
          role="tabpanel"
          aria-labelledby="tab-dossiers"
          tabIndex={0}
        >
          <h2 className="fr-h3 fr-mb-3w">Gestion des dossiers</h2>
          <DossiersList
            dossiersConnection={dossiersConnection}
            demarcheId={demarche.number}
          />
        </div>
      </div>
    </div>
  );
}
