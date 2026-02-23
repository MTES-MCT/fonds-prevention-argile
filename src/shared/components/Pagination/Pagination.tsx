"use client";

import { useId } from "react";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
}

/**
 * Composant de pagination DSFR réutilisable
 *
 * Affiche un sélecteur "Nombre lignes par page" et une navigation pagination DSFR,
 * centrés horizontalement sur une même ligne.
 */
export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100],
}: PaginationProps) {
  const reactId = useId();
  const selectId = `page-size-select${reactId}`;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  /**
   * Construit les numéros de page à afficher avec "…" pour les gaps.
   *
   * Toujours affichés : première page, dernière page, page courante.
   * Affichés si existants : page courante -1, page courante +1.
   * "…" inséré quand il y a un gap entre deux numéros consécutifs.
   */
  const getPageNumbers = (): (number | "ellipsis")[] => {
    const pages = new Set<number>();
    pages.add(1);
    pages.add(totalPages);
    pages.add(currentPage);
    if (currentPage > 1) pages.add(currentPage - 1);
    if (currentPage < totalPages) pages.add(currentPage + 1);

    const sorted = Array.from(pages).sort((a, b) => a - b);
    const result: (number | "ellipsis")[] = [];

    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
        result.push("ellipsis");
      }
      result.push(sorted[i]);
    }

    return result;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className="fr-mt-2w"
      style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: 0 }}>
        <label className="fr-label" htmlFor={selectId} style={{ marginBottom: 0, whiteSpace: "nowrap" }}>
          Nombre lignes par page
        </label>
        <select
          className="fr-select"
          id={selectId}
          name={selectId}
          value={pageSize}
          style={{ width: "5rem" }}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}>
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <nav role="navigation" className="fr-pagination" aria-label="Pagination">
        <ul className="fr-pagination__list">
          <li>
            {isFirstPage ? (
              <a className="fr-pagination__link fr-pagination__link--first" aria-disabled="true">
                Première page
              </a>
            ) : (
              <a
                className="fr-pagination__link fr-pagination__link--first"
                onClick={() => onPageChange(1)}
                title="Première page"
                style={{ cursor: "pointer" }}>
                Première page
              </a>
            )}
          </li>
          <li>
            {isFirstPage ? (
              <a
                className="fr-pagination__link fr-pagination__link--prev fr-pagination__link--lg-label"
                aria-disabled="true">
                Page précédente
              </a>
            ) : (
              <a
                className="fr-pagination__link fr-pagination__link--prev fr-pagination__link--lg-label"
                onClick={() => onPageChange(currentPage - 1)}
                title="Page précédente"
                style={{ cursor: "pointer" }}>
                Page précédente
              </a>
            )}
          </li>

          {pageNumbers.map((item, index) => {
            if (item === "ellipsis") {
              return (
                <li key={`ellipsis-${index}`} className="fr-hidden fr-unhidden-lg">
                  <span className="fr-pagination__link">…</span>
                </li>
              );
            }

            const isCurrent = item === currentPage;

            return (
              <li key={item} className={isCurrent ? undefined : "fr-hidden fr-unhidden-lg"}>
                {isCurrent ? (
                  <a className="fr-pagination__link" aria-current="page" title={`Page ${item}`}>
                    {item}
                  </a>
                ) : (
                  <a
                    className="fr-pagination__link"
                    onClick={() => onPageChange(item)}
                    title={`Page ${item}`}
                    style={{ cursor: "pointer" }}>
                    {item}
                  </a>
                )}
              </li>
            );
          })}

          <li>
            {isLastPage ? (
              <a
                className="fr-pagination__link fr-pagination__link--next fr-pagination__link--lg-label"
                aria-disabled="true">
                Page suivante
              </a>
            ) : (
              <a
                className="fr-pagination__link fr-pagination__link--next fr-pagination__link--lg-label"
                onClick={() => onPageChange(currentPage + 1)}
                title="Page suivante"
                style={{ cursor: "pointer" }}>
                Page suivante
              </a>
            )}
          </li>
          <li>
            {isLastPage ? (
              <a className="fr-pagination__link fr-pagination__link--last" aria-disabled="true">
                Dernière page
              </a>
            ) : (
              <a
                className="fr-pagination__link fr-pagination__link--last"
                onClick={() => onPageChange(totalPages)}
                title="Dernière page"
                style={{ cursor: "pointer" }}>
                Dernière page
              </a>
            )}
          </li>
        </ul>
      </nav>
    </div>
  );
}
