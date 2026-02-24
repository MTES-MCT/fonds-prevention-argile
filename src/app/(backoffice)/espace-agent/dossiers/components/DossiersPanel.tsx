"use client";

import { useCallback, useEffect, useState } from "react";
import { getAmoDossiersDataAction } from "@/features/backoffice/espace-agent/dossiers/actions";
import type { AmoDossiersData } from "@/features/backoffice/espace-agent/dossiers/domain/types";
import { STEP_LABELS } from "@/features/backoffice/espace-agent/dossiers/domain/types";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { DossiersSuivisHeader } from "./DossiersSuivisHeader";
import { DossiersSuivisTable } from "./DossiersSuivisTable";
import { Pagination } from "@/shared/components/Pagination/Pagination";
import Link from "next/link";

/**
 * Panel des dossiers pour l'espace AMO avec onglets Suivis / Archivés
 */
export function DossiersPanel() {
  const [data, setData] = useState<AmoDossiersData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination state par onglet
  const [pageSuivis, setPageSuivis] = useState(1);
  const [pageSizeSuivis, setPageSizeSuivis] = useState(20);
  const [pageArchives, setPageArchives] = useState(1);
  const [pageSizeArchives, setPageSizeArchives] = useState(20);

  // Filtre par étape par onglet
  const [filterEtapeSuivis, setFilterEtapeSuivis] = useState<Step | "">("");
  const [filterEtapeArchives, setFilterEtapeArchives] = useState<Step | "">("");

  const loadData = useCallback(async () => {
    try {
      const result = await getAmoDossiersDataAction();
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

  if (isLoading) {
    return (
      <>
        <DossiersSuivisHeader nombreDossiers={0} />
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
        <DossiersSuivisHeader nombreDossiers={0} />
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

  if (!data) {
    return null;
  }

  const handlePageSizeSuivisChange = (size: number) => {
    setPageSizeSuivis(size);
    setPageSuivis(1);
  };

  const handlePageSizeArchivesChange = (size: number) => {
    setPageSizeArchives(size);
    setPageArchives(1);
  };

  const handleFilterEtapeSuivisChange = (value: string) => {
    setFilterEtapeSuivis(value as Step | "");
    setPageSuivis(1);
  };

  const handleFilterEtapeArchivesChange = (value: string) => {
    setFilterEtapeArchives(value as Step | "");
    setPageArchives(1);
  };

  // Filtre → puis pagination
  const filteredSuivis = filterEtapeSuivis
    ? data.dossiersSuivis.filter((d) => d.etape === filterEtapeSuivis)
    : data.dossiersSuivis;
  const paginatedSuivis = filteredSuivis.slice((pageSuivis - 1) * pageSizeSuivis, pageSuivis * pageSizeSuivis);

  const filteredArchives = filterEtapeArchives
    ? data.dossiersArchives.filter((d) => d.etape === filterEtapeArchives)
    : data.dossiersArchives;
  const paginatedArchives = filteredArchives.slice(
    (pageArchives - 1) * pageSizeArchives,
    pageArchives * pageSizeArchives,
  );

  return (
    <>
      <DossiersSuivisHeader nombreDossiers={data.nombreDossiersSuivis} />
      <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          <div className="fr-tabs">
            <ul className="fr-tabs__list" role="tablist" aria-label="Dossiers">
              <li role="presentation">
                <button
                  type="button"
                  id="tab-suivis"
                  className="fr-tabs__tab"
                  tabIndex={0}
                  role="tab"
                  aria-selected="true"
                  aria-controls="tab-suivis-panel">
                  <p className="fr-badge fr-badge--sm fr-mr-2v fr-badge--blue-cumulus">{data.nombreDossiersSuivis}</p>
                  👁️ Suivis
                </button>
              </li>
              <li role="presentation">
                <button
                  type="button"
                  id="tab-archives"
                  className="fr-tabs__tab"
                  tabIndex={-1}
                  role="tab"
                  aria-selected="false"
                  aria-controls="tab-archives-panel">
                  <p className="fr-badge fr-badge--sm fr-mr-2v fr-badge--blue-cumulus">{data.nombreDossiersArchives}</p>
                  🗂️ Archivés
                </button>
              </li>
            </ul>
            <div
              id="tab-suivis-panel"
              className="fr-tabs__panel fr-tabs__panel--selected"
              role="tabpanel"
              aria-labelledby="tab-suivis"
              tabIndex={0}>
              {data.nombreDossiersSuivis === 0 ? (
                <div className="fr-alert fr-alert--info">
                  <h3 className="fr-alert__title">Vous n&apos;avez pas de dossier suivi</h3>
                  <p>
                    Recevez et acceptez des demandes d&apos;accompagnement. Les dossiers liés apparaîtront ensuite.
                  </p>
                </div>
              ) : (
                <>
                  <div className="fr-select-group" style={{ maxWidth: "300px", marginLeft: "auto" }}>
                    <label className="fr-label" htmlFor="filtre-etape-suivis">
                      Étape
                    </label>
                    <select
                      className="fr-select"
                      id="filtre-etape-suivis"
                      name="filtre-etape-suivis"
                      value={filterEtapeSuivis}
                      onChange={(e) => handleFilterEtapeSuivisChange(e.target.value)}>
                      <option value="">Toutes les étapes</option>
                      {Object.entries(STEP_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <DossiersSuivisTable dossiers={paginatedSuivis} onRefresh={loadData} />
                  <Pagination
                    currentPage={pageSuivis}
                    totalItems={filteredSuivis.length}
                    pageSize={pageSizeSuivis}
                    onPageChange={setPageSuivis}
                    onPageSizeChange={handlePageSizeSuivisChange}
                  />
                </>
              )}
            </div>
            <div
              id="tab-archives-panel"
              className="fr-tabs__panel"
              role="tabpanel"
              aria-labelledby="tab-archives"
              tabIndex={0}>
              <div className="fr-select-group" style={{ maxWidth: "300px", marginLeft: "auto" }}>
                <label className="fr-label" htmlFor="filtre-etape-archives">
                  Étape
                </label>
                <select
                  className="fr-select"
                  id="filtre-etape-archives"
                  name="filtre-etape-archives"
                  value={filterEtapeArchives}
                  onChange={(e) => handleFilterEtapeArchivesChange(e.target.value)}>
                  <option value="">Toutes les étapes</option>
                  {Object.entries(STEP_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <DossiersSuivisTable dossiers={paginatedArchives} isArchived onRefresh={loadData} />
              <Pagination
                currentPage={pageArchives}
                totalItems={filteredArchives.length}
                pageSize={pageSizeArchives}
                onPageChange={setPageArchives}
                onPageSizeChange={handlePageSizeArchivesChange}
              />
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
