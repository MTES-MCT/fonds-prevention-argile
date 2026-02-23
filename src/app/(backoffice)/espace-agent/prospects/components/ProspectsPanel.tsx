"use client";

import { useEffect, useState } from "react";
import { getProspectsListAction } from "../../../../../features/backoffice/espace-agent/prospects/actions/get-prospects-list.actions";
import type { ProspectsListResult } from "../../../../../features/backoffice/espace-agent/prospects/domain/types";
import { ProspectsHeader } from "./ProspectsHeader";
import { ProspectsTable } from "./ProspectsTable";
import { Pagination } from "@/shared/components/Pagination/Pagination";

/**
 * Panel principal pour l'espace Prospects (Allers-Vers)
 *
 * Charge les données et affiche :
 * - Header avec greeting + StatTile (nombre de prospects)
 * - Informations territoire
 * - Tableau des prospects avec pagination
 */
export function ProspectsPanel() {
  const [data, setData] = useState<ProspectsListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      const result = await getProspectsListAction();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error ?? "Erreur inconnue");
      }

      setLoading(false);
    }

    loadData();
  }, []);

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

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const paginatedProspects = data.prospects.slice((page - 1) * pageSize, page * pageSize);

  return (
    <>
      <ProspectsHeader nombreProspects={data.totalCount} hasAmoDisponible={data.hasAmoDisponible} />

      <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          <h2 className="fr-h3 fr-mb-4w">
            {data.totalCount} nouveaux prospect{data.totalCount > 1 ? "s" : ""}
          </h2>

          <ProspectsTable prospects={paginatedProspects} />
          {data.totalCount > pageSize && (
            <Pagination
              currentPage={page}
              totalItems={data.totalCount}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </div>
      </section>
    </>
  );
}
