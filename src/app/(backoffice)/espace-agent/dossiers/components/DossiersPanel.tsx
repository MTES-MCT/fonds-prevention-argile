"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getDossiersTerritoireDataAction,
  type DossiersTerritoireData,
} from "@/features/backoffice/espace-agent/dossiers/actions/get-dossiers-territoire-data.action";
import type { DossierItem } from "@/features/backoffice/espace-agent/dossiers/domain/types";
import { getResponsableTabLabel, type ResponsableTabId } from "@/features/backoffice/espace-agent/dossiers/domain";
import { DossiersSuivisHeader } from "./DossiersSuivisHeader";
import { DossiersSuivisTable } from "./DossiersSuivisTable";
import { DossiersKpiCards } from "./DossiersKpiCards";
import { Pagination } from "@/shared/components/Pagination/Pagination";

interface DossiersPanelProps {
  /** Affiche le bouton "+ Nouveau dossier" (rôles AMO et/ou Aller-vers). */
  canCreateDossier?: boolean;
  /** Prénom de l'agent connecté (« Bonjour … »). */
  prenom: string | null;
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
export function DossiersPanel({ canCreateDossier = false, prenom }: DossiersPanelProps) {
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

  // Liste des EPCI distincts (avec leur nom lisible) fournie par le serveur.
  const availableEpcis = data?.epcisDisponibles ?? [];

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
        <DossiersSuivisHeader prenom={prenom} />
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
        <DossiersSuivisHeader prenom={prenom} />
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
      <div className="fr-container fr-py-6w">
        <DossiersSuivisHeader prenom={prenom} />
        <DossiersKpiCards counters={counters} />
      </div>
      <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          <h2 className="fr-h4 fr-mb-3w">Tous les dossiers ({data.total})</h2>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <ul className="fr-tags-group fr-mb-0" aria-label="Filtrer les dossiers par responsable">
              {TAB_IDS.map((tab) => (
                <li key={tab}>
                  <button
                    type="button"
                    className="fr-tag"
                    aria-pressed={activeTab === tab}
                    onClick={() => handleTabChange(tab)}>
                    <span className="fr-badge fr-badge--sm fr-mr-1v fr-badge--blue-cumulus">{counters[tab]}</span>
                    {getTabLabel(tab, data.dossiers)}
                  </button>
                </li>
              ))}
            </ul>
            {canCreateDossier && (
              <Link
                href="/espace-agent/dossiers/nouveau?intent=amo"
                className="fr-btn fr-icon-add-line fr-btn--icon-left self-start md:self-auto whitespace-nowrap">
                Nouveau dossier
              </Link>
            )}
          </div>

          <div className="fr-grid-row fr-grid-row--gutters fr-mt-3w fr-mb-2w">
            <div className="fr-col-12 fr-col-md-6">
              <label className="fr-label sr-only" htmlFor="dossiers-search">
                Rechercher
              </label>
              <input
                className="fr-input"
                id="dossiers-search"
                type="search"
                placeholder="Rechercher (nom, commune...)"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='%23161616' d='M18.031 16.617l4.283 4.282-1.415 1.415-4.282-4.283A8.96 8.96 0 0 1 11 20c-4.968 0-9-4.032-9-9s4.032-9 9-9 9 4.032 9 9a8.96 8.96 0 0 1-1.969 5.617zm-2.006-.742A6.977 6.977 0 0 0 18 11c0-3.867-3.133-7-7-7-3.867 0-7 3.133-7 7 0 3.867 3.133 7 7 7a6.977 6.977 0 0 0 4.875-1.975l.15-.15z'/></svg>\")",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "calc(100% - 0.75rem) 50%",
                  backgroundSize: "1rem 1rem",
                  paddingRight: "2.5rem",
                }}
              />
            </div>
            <div className="fr-col-12 fr-col-md-4">
              <label className="fr-label sr-only" htmlFor="dossiers-epci">
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
                <option value="">EPCI</option>
                {availableEpcis.map((epci) => (
                  <option key={epci.code} value={epci.code}>
                    {epci.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="fr-alert fr-alert--info">
              <h3 className="fr-alert__title">Aucun dossier</h3>
              <p>Aucun dossier ne correspond à ces filtres.</p>
            </div>
          ) : (
            <>
              <DossiersSuivisTable dossiers={paginated} isArchived={activeTab === "ARCHIVE"} onRefresh={loadData} />
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
