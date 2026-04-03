"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminBreadcrumb } from "../../shared/components/AdminBreadcrumb";
import { Pagination } from "@/shared/components";
import { getCommentairesAdminAction } from "@/features/backoffice/administration/commentaires/actions";
import type {
  CommentaireAdminDetail,
  CommentairesAdminFilters,
} from "@/features/backoffice/administration/commentaires/domain/types/commentaire-admin.types";
import type { StructureType } from "@/features/backoffice/espace-agent/shared/domain/types/commentaire.types";
import { formatDateTime } from "@/shared/utils/date.utils";

const STRUCTURE_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Toutes les structures" },
  { value: "AMO", label: "AMO" },
  { value: "ALLERS_VERS", label: "Allers-Vers" },
  { value: "ADMINISTRATION", label: "Administration" },
  { value: "DDT", label: "DDT" },
];

const STRUCTURE_LABELS: Record<string, string> = {
  AMO: "AMO",
  ALLERS_VERS: "Allers-Vers",
  ADMINISTRATION: "Administration",
  DDT: "DDT",
};

export default function CommentairesAdminPanel() {
  const [commentaires, setCommentaires] = useState<CommentaireAdminDetail[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [searchQuery, setSearchQuery] = useState("");
  const [structureType, setStructureType] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const filters: CommentairesAdminFilters = {
      page,
      pageSize,
      searchQuery: searchQuery || undefined,
      authorStructureType: (structureType as StructureType) || undefined,
      dateDebut: dateDebut || undefined,
      dateFin: dateFin || undefined,
    };

    const result = await getCommentairesAdminAction(filters);

    if (result.success) {
      setCommentaires(result.data.commentaires);
      setTotalCount(result.data.totalCount);
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  }, [page, pageSize, searchQuery, structureType, dateDebut, dateFin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilter = () => {
    setPage(1);
    loadData();
  };

  const handleReset = () => {
    setSearchQuery("");
    setStructureType("");
    setDateDebut("");
    setDateFin("");
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  return (
    <>
      {/* En-tete — fond blanc */}
      <section className="fr-container-fluid fr-pt-4w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
        <div className="fr-container">
          <AdminBreadcrumb currentPageLabel="Notes partagees" />
          <div className="fr-grid-row fr-grid-row--middle fr-mb-4w">
            <div className="fr-col">
              <h1 className="fr-h2 fr-mb-1v">Notes partagees</h1>
              <p style={{ color: "var(--text-mention-grey)", marginBottom: 0 }}>
                Ensemble des notes internes laissees par les professionnels sur les parcours des demandeurs.
              </p>
            </div>
            {!isLoading && (
              <div className="fr-col-auto">
                <p className="fr-badge fr-badge--sm fr-badge--blue-cumulus fr-badge--no-icon">
                  {totalCount} note{totalCount > 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>

          {/* Filtres */}
          <div className="fr-grid-row fr-grid-row--gutters fr-mb-4w">
            <div className="fr-col-12 fr-col-md-3">
              <label className="fr-label" htmlFor="search-commentaires">
                Recherche (auteur ou demandeur)
              </label>
              <input
                className="fr-input"
                type="text"
                id="search-commentaires"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFilter()}
                placeholder="Nom de l'auteur ou du demandeur"
              />
            </div>
            <div className="fr-col-12 fr-col-md-2">
              <label className="fr-label" htmlFor="structure-type-filter">
                Structure
              </label>
              <select
                className="fr-select"
                id="structure-type-filter"
                value={structureType}
                onChange={(e) => setStructureType(e.target.value)}>
                {STRUCTURE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="fr-col-12 fr-col-md-2">
              <label className="fr-label" htmlFor="date-debut-filter">
                Date debut
              </label>
              <input
                className="fr-input"
                type="date"
                id="date-debut-filter"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
              />
            </div>
            <div className="fr-col-12 fr-col-md-2">
              <label className="fr-label" htmlFor="date-fin-filter">
                Date fin
              </label>
              <input
                className="fr-input"
                type="date"
                id="date-fin-filter"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
              />
            </div>
            <div className="fr-col-12 fr-col-md-3" style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
              <button type="button" className="fr-btn" onClick={handleFilter}>
                Filtrer
              </button>
              <button type="button" className="fr-btn fr-btn--secondary" onClick={handleReset}>
                Reinitialiser
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Contenu — fond bleu */}
      <section className="fr-container-fluid fr-py-4w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          {error && (
            <div className="fr-alert fr-alert--error fr-mb-4w">
              <p>{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-gray-500">Chargement des notes...</div>
            </div>
          ) : commentaires.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-gray-500">Aucune note trouvee.</div>
            </div>
          ) : (
            <>
              <div className="fr-table fr-table--lg fr-table--bordered">
                <div className="fr-table__wrapper">
                  <div className="fr-table__container">
                    <div className="fr-table__content">
                      <table>
                        <thead>
                          <tr>
                            <th scope="col">Date</th>
                            <th scope="col">Auteur</th>
                            <th scope="col">Structure</th>
                            <th scope="col">Message</th>
                            <th scope="col">Demandeur</th>
                            <th scope="col">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {commentaires.map((commentaire) => (
                            <tr key={commentaire.id}>
                              <td className="fr-text--sm">
                                {formatDateTime(commentaire.createdAt.toString())}
                                {commentaire.editedAt && (
                                  <span
                                    className="fr-text--xs"
                                    style={{ color: "var(--text-mention-grey)", display: "block" }}>
                                    (modifie)
                                  </span>
                                )}
                              </td>
                              <td className="fr-text--sm">{commentaire.authorName}</td>
                              <td>
                                {commentaire.authorStructureType && (
                                  <span className="fr-badge fr-badge--sm fr-badge--no-icon">
                                    {STRUCTURE_LABELS[commentaire.authorStructureType] ??
                                      commentaire.authorStructureType}
                                  </span>
                                )}
                                {commentaire.authorStructure && (
                                  <span
                                    className="fr-text--xs"
                                    style={{ display: "block", color: "var(--text-mention-grey)" }}>
                                    {commentaire.authorStructure}
                                  </span>
                                )}
                              </td>
                              <td className="fr-text--sm" style={{ minWidth: "300px" }}>
                                {commentaire.message}
                              </td>
                              <td className="fr-text--sm">
                                {commentaire.demandeur.prenom || commentaire.demandeur.nom
                                  ? `${commentaire.demandeur.prenom ?? ""} ${commentaire.demandeur.nom ?? ""}`.trim()
                                  : "-"}
                              </td>
                              <td>
                                <a
                                  className="fr-btn fr-btn--sm fr-btn--tertiary-no-outline"
                                  href={`/espace-agent/dossiers/${commentaire.parcoursId}`}>
                                  Voir le dossier
                                </a>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              <Pagination
                currentPage={page}
                totalItems={totalCount}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </>
          )}
        </div>
      </section>
    </>
  );
}
