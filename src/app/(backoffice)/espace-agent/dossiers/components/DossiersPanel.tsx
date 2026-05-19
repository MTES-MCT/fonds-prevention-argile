"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getDossiersTerritoireDataAction,
  type DossiersTerritoireData,
} from "@/features/backoffice/espace-agent/dossiers/actions/get-dossiers-territoire-data.action";
import type { DossierItem } from "@/features/backoffice/espace-agent/dossiers/domain/types";
import {
  getResponsableTabLabel,
  type ResponsableTabId,
} from "@/features/backoffice/espace-agent/dossiers/domain";
import { DossiersSuivisHeader } from "./DossiersSuivisHeader";
import { DossiersSuivisTable } from "./DossiersSuivisTable";
import { Pagination } from "@/shared/components/Pagination/Pagination";

interface DossiersPanelProps {
  /** Affiche le bouton "+ Nouveau dossier" (rôles AMO et/ou Aller-vers). */
  canCreateDossier?: boolean;
}

const TAB_IDS: ResponsableTabId[] = ["tous", "AV", "AMO", "MENAGE", "DDT", "ARCHIVE"];

/** Filtre une liste de dossiers selon l'onglet « En attente de ». */
function filterByTab(dossiers: DossierItem[], tab: ResponsableTabId): DossierItem[] {
  if (tab === "tous") return dossiers.filter((d) => d.responsable.type !== "ARCHIVE");
  return dossiers.filter((d) => d.responsable.type === tab);
}

function getDeptsForTab(dossiers: DossierItem[], tab: ResponsableTabId): string[] {
  const set = new Set<string>();
  for (const d of filterByTab(dossiers, tab)) {
    if (d.responsable.type === "AV" || d.responsable.type === "AMO") {
      if (d.responsable.codeDepartement) set.add(d.responsable.codeDepartement);
    }
  }
  return Array.from(set).sort();
}

function getTabLabel(tab: ResponsableTabId, dossiers: DossierItem[]): string {
  switch (tab) {
    case "tous":
      return "Tous";
    case "AV":
      return getResponsableTabLabel("AV", getDeptsForTab(dossiers, "AV"));
    case "AMO":
      return getResponsableTabLabel("AMO", getDeptsForTab(dossiers, "AMO"));
    case "MENAGE":
      return "Ménage";
    case "DDT":
      return "Instruction DDT";
    case "ARCHIVE":
      return "Archivés";
  }
}

/**
 * Panel unifié des dossiers — onglets par responsable, filtre EPCI et recherche.
 */
export function DossiersPanel({ canCreateDossier = false }: DossiersPanelProps = {}) {
  const [data, setData] = useState<DossiersTerritoireData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<ResponsableTabId>("tous");
  const [epciFilter, setEpciFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadData = useCallback(async () => {
    try {
      const result = await getDossiersTerritoireDataAction();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (e) {
      setError("Erreur lors du chargement des données");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Liste des EPCI distincts présents pour peupler le filtre.
  const availableEpcis = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const d of data.dossiers) {
      if (d.logement.codeEpci) set.add(d.logement.codeEpci);
    }
    return Array.from(set).sort();
  }, [data]);

  const counters = useMemo(() => {
    const map: Record<ResponsableTabId, number> = { tous: 0, AV: 0, AMO: 0, MENAGE: 0, DDT: 0, ARCHIVE: 0 };
    if (!data) return map;
    for (const tab of TAB_IDS) map[tab] = filterByTab(data.dossiers, tab).length;
    return map;
  }, [data]);

  const visible = useMemo(() => {
    if (!data) return [];
    const byTab = filterByTab(data.dossiers, activeTab);
    const byEpci = epciFilter ? byTab.filter((d) => d.logement.codeEpci === epciFilter) : byTab;
    if (!search.trim()) return byEpci;
    const q = search.trim().toLowerCase();
    return byEpci.filter((d) => {
      const nom = `${d.particulier.prenom} ${d.particulier.nom}`.toLowerCase();
      const commune = d.logement.commune?.toLowerCase() ?? "";
      return nom.includes(q) || commune.includes(q);
    });
  }, [data, activeTab, epciFilter, search]);

  const paginated = visible.slice((page - 1) * pageSize, page * pageSize);

  const handleTabChange = (tab: ResponsableTabId) => {
    setActiveTab(tab);
    setPage(1);
  };

  if (isLoading) {
    return (
      <>
        <DossiersSuivisHeader nombreDossiers={0} canCreateDossier={canCreateDossier} />
        <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
          <div className="fr-container">
            <p>Chargement...</p>
          </div>
        </section>
      </>
    );
  }

  if (error) {
    return (
      <>
        <DossiersSuivisHeader nombreDossiers={0} canCreateDossier={canCreateDossier} />
        <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
          <div className="fr-container">
            <div className="fr-alert fr-alert--error">
              <h3 className="fr-alert__title">Erreur</h3>
              <p>{error}</p>
            </div>
          </div>
        </section>
      </>
    );
  }

  if (!data) return null;

  return (
    <>
      <DossiersSuivisHeader nombreDossiers={data.total} canCreateDossier={canCreateDossier} />
      <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          <div className="fr-tabs">
            <ul className="fr-tabs__list" role="tablist" aria-label="Dossiers par responsable">
              {TAB_IDS.map((tab) => (
                <li key={tab} role="presentation">
                  <button
                    type="button"
                    id={`tab-${tab}`}
                    className="fr-tabs__tab"
                    tabIndex={activeTab === tab ? 0 : -1}
                    role="tab"
                    aria-selected={activeTab === tab}
                    aria-controls="tab-active-panel"
                    onClick={() => handleTabChange(tab)}>
                    <p className="fr-badge fr-badge--sm fr-mr-2v fr-badge--blue-cumulus">{counters[tab]}</p>
                    {getTabLabel(tab, data.dossiers)}
                  </button>
                </li>
              ))}
            </ul>

            <div
              id="tab-active-panel"
              className="fr-tabs__panel fr-tabs__panel--selected"
              role="tabpanel"
              aria-labelledby={`tab-${activeTab}`}
              tabIndex={0}>
              <div className="fr-grid-row fr-grid-row--gutters fr-mb-2w">
                <div className="fr-col-12 fr-col-md-6">
                  <div className="fr-input-group">
                    <label className="fr-label" htmlFor="dossiers-search">
                      Rechercher
                    </label>
                    <input
                      className="fr-input"
                      id="dossiers-search"
                      type="search"
                      placeholder="Nom du demandeur, commune..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>
                </div>
                <div className="fr-col-12 fr-col-md-4">
                  <div className="fr-select-group">
                    <label className="fr-label" htmlFor="dossiers-epci">
                      EPCI
                    </label>
                    <select
                      className="fr-select"
                      id="dossiers-epci"
                      value={epciFilter}
                      onChange={(e) => {
                        setEpciFilter(e.target.value);
                        setPage(1);
                      }}>
                      <option value="">Tous les EPCI</option>
                      {availableEpcis.map((epci) => (
                        <option key={epci} value={epci}>
                          {epci}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {visible.length === 0 ? (
                <div className="fr-alert fr-alert--info">
                  <h3 className="fr-alert__title">Aucun dossier</h3>
                  <p>Aucun dossier ne correspond à ces filtres.</p>
                </div>
              ) : (
                <>
                  <DossiersSuivisTable
                    dossiers={paginated}
                    isArchived={activeTab === "ARCHIVE"}
                    onRefresh={loadData}
                  />
                  <Pagination
                    currentPage={page}
                    totalItems={visible.length}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => {
                      setPageSize(size);
                      setPage(1);
                    }}
                  />
                </>
              )}
            </div>
          </div>

          <div className="fr-callout fr-mt-4w">
            <h3 className="fr-callout__title">Le saviez-vous ?</h3>
            <p className="fr-callout__text">
              Un demandeur peut vous inviter à consulter et remplir ses formulaires. Les options d&apos;accès sont
              disponibles sur son compte{" "}
              <Link href="https://demarche.numerique.gouv.fr" target="_blank" rel="noopener noreferrer">
                demarche.numerique.gouv.fr
              </Link>{" "}
              (dans chaque formulaire).
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
