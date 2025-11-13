"use client";

import { useState } from "react";
import DemarcheInfo from "./eligibilite/EligibiliteDemarcheInfo";
import DemarcheSchema from "./eligibilite/EligibiliteDemarcheSchema";
import DossiersList from "./eligibilite/EligibiliteDossiersList";
import EmailNotificationsList from "./acces-anticipes/EmailNotificationsList";
import { AmoSeedUpload } from "./amo/AmoSeedUpload";
import {
  DemarcheDetailed,
  DossiersConnection,
} from "@/features/parcours/dossiers-ds/adapters/graphql";
import StatistiquesPanel from "./statistiques/StatistiquesPanel";

interface AdminDashboardProps {
  demarche: DemarcheDetailed;
  dossiersConnection: DossiersConnection | null;
  schema: DemarcheDetailed | null;
}

type TabId =
  | "statistiques"
  | "early-access"
  | "demarche-info"
  | "dossiers"
  | "amo";

export default function AdminDashboard({
  demarche,
  dossiersConnection,
  schema,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabId>("statistiques");
  const [isStatsMenuOpen, setIsStatsMenuOpen] = useState(false);

  const links = [
    {
      id: "statistiques" as TabId,
      label: "Statistiques",
      icon: "fr-icon-bar-chart-box-line",
    },
    {
      id: "early-access" as TabId,
      label: "Accès anticipés",
      icon: "fr-icon-mail-line",
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
    {
      id: "amo" as TabId,
      label: "Entreprises AMO",
      icon: "fr-icon-building-line",
    },
  ];

  return (
    <>
      {/* Navigation principale avec ombre */}
      <div style={{ boxShadow: "0 8px 16px 0 rgba(0, 0, 0, 0.1)" }}>
        <div className="fr-container">
          <nav
            className="fr-nav"
            role="navigation"
            aria-label="Menu d'administration"
          >
            <ul className="fr-nav__list">
              {/* Menu déroulant géré manuellement */}
              <li className="fr-nav__item">
                <button
                  type="button"
                  className="fr-nav__btn"
                  aria-expanded={isStatsMenuOpen}
                  aria-controls="collapse-menu-stats"
                  aria-current={
                    activeTab === "statistiques" ? "true" : undefined
                  }
                  onClick={() => setIsStatsMenuOpen(!isStatsMenuOpen)}
                >
                  <span className="fr-icon-bar-chart-box-line fr-mr-2v" />
                  Statistiques
                </button>
                <div
                  className={`fr-collapse fr-menu ${isStatsMenuOpen ? "fr-collapse--expanded" : ""}`}
                  id="collapse-menu-stats"
                >
                  <ul className="fr-menu__list">
                    <li>
                      <a
                        className="fr-nav__link"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab("statistiques");
                          setIsStatsMenuOpen(false);
                        }}
                      >
                        Vue globale
                      </a>
                    </li>
                    <li>
                      <a
                        className="fr-nav__link"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab("statistiques");
                          setIsStatsMenuOpen(false);
                        }}
                      >
                        Détails
                      </a>
                    </li>
                  </ul>
                </div>
              </li>

              {/* Liens directs */}
              {links.slice(1).map((link) => (
                <li key={link.id} className="fr-nav__item">
                  <a
                    className="fr-nav__link"
                    href="#"
                    aria-current={activeTab === link.id ? "page" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab(link.id);
                    }}
                  >
                    <span className={`${link.icon} fr-mr-2v`} />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      {/* Zone avec fond bleu pour le titre */}
      <div className="fr-py-6w fr-background-alt--blue-cumulus">
        <div className="fr-container">
          <div className="fr-grid-row">
            <div className="fr-col-10">
              <h1 className="fr-mt-6v">Administration - Fonds de Prévention</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu des panels */}
      <div className="fr-container fr-mt-6w">
        {/* Panel Statistiques */}
        <div
          className={activeTab === "statistiques" ? "" : "fr-hidden"}
          role="region"
          aria-label="Statistiques"
        >
          <StatistiquesPanel />
        </div>

        {/* Panel Accès anticipés */}
        <div
          className={activeTab === "early-access" ? "" : "fr-hidden"}
          role="region"
          aria-label="Accès anticipés"
        >
          <h2 className="fr-h3 fr-mb-3w">Inscriptions accès anticipés</h2>
          <EmailNotificationsList />
        </div>

        {/* Panel Infos démarche */}
        <div
          className={activeTab === "demarche-info" ? "" : "fr-hidden"}
          role="region"
          aria-label="Infos démarche"
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
          className={activeTab === "dossiers" ? "" : "fr-hidden"}
          role="region"
          aria-label="Dossiers"
        >
          <h2 className="fr-h3 fr-mb-3w">Gestion des dossiers</h2>
          <DossiersList
            dossiersConnection={dossiersConnection}
            demarcheId={demarche.number}
          />
        </div>

        {/* Panel Entreprises AMO */}
        <div
          className={activeTab === "amo" ? "" : "fr-hidden"}
          role="region"
          aria-label="Entreprises AMO"
        >
          <AmoSeedUpload />
        </div>
      </div>
    </>
  );
}
