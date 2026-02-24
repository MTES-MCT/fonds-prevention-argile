"use client";

import { useCallback, useEffect, useState } from "react";
import { getProspectsListAction } from "../../../../../features/backoffice/espace-agent/prospects/actions/get-prospects-list.actions";
import type { ProspectsListResult } from "../../../../../features/backoffice/espace-agent/prospects/domain/types";
import { ProspectsHeader } from "./ProspectsHeader";
import { ProspectsTable } from "./ProspectsTable";
import { Pagination } from "@/shared/components/Pagination/Pagination";

/**
 * Panel principal pour l'espace Prospects (Allers-Vers)
 *
 * Charge les données et affiche :
 * - Header avec greeting + 3 StatTiles
 * - 3 onglets DSFR : Prospects, Éligibles, Archivés
 * - Tableau + pagination par onglet
 */
export function ProspectsPanel() {
  const [data, setData] = useState<ProspectsListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination par onglet
  const [pageProspects, setPageProspects] = useState(1);
  const [pageSizeProspects, setPageSizeProspects] = useState(20);
  const [pageEligibles, setPageEligibles] = useState(1);
  const [pageSizeEligibles, setPageSizeEligibles] = useState(20);
  const [pageArchives, setPageArchives] = useState(1);
  const [pageSizeArchives, setPageSizeArchives] = useState(20);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getProspectsListAction();

    if (result.success) {
      setData(result.data);
    } else {
      setError(result.error ?? "Erreur inconnue");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="fr-container fr-py-4w">
        <p>Chargement...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fr-container fr-py-4w">
        <div className="fr-alert fr-alert--error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const handlePageSizeProspectsChange = (size: number) => {
    setPageSizeProspects(size);
    setPageProspects(1);
  };

  const handlePageSizeEligiblesChange = (size: number) => {
    setPageSizeEligibles(size);
    setPageEligibles(1);
  };

  const handlePageSizeArchivesChange = (size: number) => {
    setPageSizeArchives(size);
    setPageArchives(1);
  };

  const paginatedProspects = data.prospects.slice(
    (pageProspects - 1) * pageSizeProspects,
    pageProspects * pageSizeProspects
  );
  const paginatedEligibles = data.prospectsEligibles.slice(
    (pageEligibles - 1) * pageSizeEligibles,
    pageEligibles * pageSizeEligibles
  );
  const paginatedArchives = data.prospectsArchives.slice(
    (pageArchives - 1) * pageSizeArchives,
    pageArchives * pageSizeArchives
  );

  return (
    <>
      <ProspectsHeader
        nombreProspects={data.totalProspects}
        nombreEligibles={data.totalEligibles}
        nombreArchives={data.totalArchives}
        hasAmoDisponible={data.hasAmoDisponible}
      />

      <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          <div className="fr-tabs">
            <ul className="fr-tabs__list" role="tablist" aria-label="Prospects">
              <li role="presentation">
                <button
                  type="button"
                  id="tab-prospects"
                  className="fr-tabs__tab"
                  tabIndex={0}
                  role="tab"
                  aria-selected="true"
                  aria-controls="tab-prospects-panel">
                  <p className="fr-badge fr-badge--sm fr-mr-2v fr-badge--yellow-tournesol">{data.totalProspects}</p>
                  🔥 Prospects
                </button>
              </li>
              <li role="presentation">
                <button
                  type="button"
                  id="tab-eligibles"
                  className="fr-tabs__tab"
                  tabIndex={-1}
                  role="tab"
                  aria-selected="false"
                  aria-controls="tab-eligibles-panel">
                  <p className="fr-badge fr-badge--sm fr-mr-2v fr-badge--blue-cumulus">{data.totalEligibles}</p>✅
                  Éligibles
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
                  <p className="fr-badge fr-badge--sm fr-mr-2v fr-badge--blue-cumulus">{data.totalArchives}</p>
                  🗂️ Archivés
                </button>
              </li>
            </ul>

            {/* Onglet Prospects */}
            <div
              id="tab-prospects-panel"
              className="fr-tabs__panel fr-tabs__panel--selected"
              role="tabpanel"
              aria-labelledby="tab-prospects"
              tabIndex={0}>
              <ProspectsTable prospects={paginatedProspects} variant="prospect" onRefresh={loadData} />
              <Pagination
                currentPage={pageProspects}
                totalItems={data.totalProspects}
                pageSize={pageSizeProspects}
                onPageChange={setPageProspects}
                onPageSizeChange={handlePageSizeProspectsChange}
              />
            </div>

            {/* Onglet Éligibles */}
            <div
              id="tab-eligibles-panel"
              className="fr-tabs__panel"
              role="tabpanel"
              aria-labelledby="tab-eligibles"
              tabIndex={0}>
              <ProspectsTable prospects={paginatedEligibles} variant="eligible" onRefresh={loadData} />
              <Pagination
                currentPage={pageEligibles}
                totalItems={data.totalEligibles}
                pageSize={pageSizeEligibles}
                onPageChange={setPageEligibles}
                onPageSizeChange={handlePageSizeEligiblesChange}
              />
            </div>

            {/* Onglet Archivés */}
            <div
              id="tab-archives-panel"
              className="fr-tabs__panel"
              role="tabpanel"
              aria-labelledby="tab-archives"
              tabIndex={0}>
              <ProspectsTable prospects={paginatedArchives} variant="archive" onRefresh={loadData} />
              <Pagination
                currentPage={pageArchives}
                totalItems={data.totalArchives}
                pageSize={pageSizeArchives}
                onPageChange={setPageArchives}
                onPageSizeChange={handlePageSizeArchivesChange}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
