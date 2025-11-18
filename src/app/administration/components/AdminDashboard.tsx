"use client";

import { useState } from "react";
import DemarcheInfo from "./eligibilite/EligibiliteDemarcheInfo";
import DemarcheSchema from "./eligibilite/EligibiliteDemarcheSchema";
import DossiersList from "./eligibilite/EligibiliteDossiersList";
import { AmoSeedUpload } from "./amo/AmoSeedUpload";
import { DemarcheDetailed, DossiersConnection } from "@/features/parcours/dossiers-ds/adapters/graphql";
import StatistiquesPanel from "./statistiques/StatistiquesPanel";
import UsersPanel from "./users/UsersPanel";

interface AdminDashboardProps {
  demarche: DemarcheDetailed;
  dossiersConnection: DossiersConnection | null;
  schema: DemarcheDetailed | null;
}

type TabId = "statistiques" | "users" | "amo" | "demarche-info" | "dossiers";

export default function AdminDashboard({ demarche, dossiersConnection, schema }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>("statistiques");

  const links = [
    {
      id: "statistiques" as TabId,
      label: "Statistiques",
      icon: "fr-icon-bar-chart-box-line",
    },
    {
      id: "users" as TabId,
      label: "Utilisateurs",
      icon: "fr-icon-user-line",
    },
    {
      id: "amo" as TabId,
      label: "Entreprises AMO",
      icon: "fr-icon-building-line",
    },
    {
      id: "demarche-info" as TabId,
      label: "Démarche DS",
      icon: "fr-icon-information-line",
    },
    {
      id: "dossiers" as TabId,
      label: "Dossiers",
      icon: "fr-icon-file-text-line",
    },
  ];

  return (
    <>
      {/* Navigation principale avec ombre */}
      <div style={{ boxShadow: "0 8px 16px 0 rgba(0, 0, 0, 0.1)" }}>
        <div className="fr-container">
          <nav className="fr-nav" role="navigation" aria-label="Menu d'administration">
            <ul className="fr-nav__list">
              {/* Liens directs */}
              {links.map((link) => (
                <li key={link.id} className="fr-nav__item">
                  <a
                    className="fr-nav__link"
                    href="#"
                    aria-current={activeTab === link.id ? "page" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab(link.id);
                    }}>
                    <span className={`${link.icon} fr-mr-2v`} />
                    {link.label}
                  </a>
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
          <AmoSeedUpload />
        </div>

        {/* Panel Infos démarche */}
        <div className={activeTab === "demarche-info" ? "" : "fr-hidden"} role="region" aria-label="Infos démarche">
          <DemarcheInfo demarche={demarche} />
          <div className="fr-mt-6w">
            <DemarcheSchema champDescriptors={schema?.activeRevision?.champDescriptors} />
          </div>
        </div>

        {/* Panel Dossiers */}
        <div className={activeTab === "dossiers" ? "" : "fr-hidden"} role="region" aria-label="Dossiers">
          <h2 className="fr-h3 fr-mb-3w">Gestion des dossiers</h2>
          <DossiersList dossiersConnection={dossiersConnection} demarcheId={demarche.number} />
        </div>
      </div>
    </>
  );
}
