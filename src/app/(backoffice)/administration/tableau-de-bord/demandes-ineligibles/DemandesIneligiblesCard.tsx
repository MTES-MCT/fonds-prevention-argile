"use client";

import { useId } from "react";
import { VariationBadge } from "../shared/VariationBadge";
import type { DemandesIneligiblesStats } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

interface DemandesIneligiblesCardProps {
  stats: DemandesIneligiblesStats;
  loading?: boolean;
}

export function DemandesIneligiblesCard({ stats, loading = false }: DemandesIneligiblesCardProps) {
  const tooltipId = useId();

  if (loading) {
    return (
      <div
        className="fr-p-3w"
        style={{
          backgroundColor: "var(--background-default-grey)",
          border: "1px solid var(--border-default-grey)",
        }}>
        <p className="fr-text--lg fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
          Chargement...
        </p>
      </div>
    );
  }

  if (stats.total === 0) {
    return null;
  }

  // Afficher tous les motifs du top 5, ligne "Autre" uniquement pour les motifs hors top 5
  const motifsAffiches = stats.motifs;
  const autresCount = stats.autresMotifs.reduce((acc, m) => acc + m.count, 0);
  const autresPourcentage = stats.total > 0 ? Math.round((autresCount / stats.total) * 100) : 0;

  return (
    <div
      style={{
        backgroundColor: "var(--background-default-grey)",
        border: "1px solid var(--border-default-grey)",
      }}>
      {/* Header + sous-titre */}
      <div className="fr-px-2w fr-pt-2w">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span
              className="fr-icon-close-circle-line"
              style={{ color: "var(--text-default-error)" }}
              aria-hidden="true"
            />
            <h2 className="fr-text--lg fr-mb-0" style={{ fontWeight: 700 }}>
              Demandes inéligibles ({stats.total.toLocaleString("fr-FR")}){" "}
              <button aria-describedby={tooltipId} type="button" className="fr-btn--tooltip fr-btn">
                Information
              </button>
              <span className="fr-tooltip fr-placement" id={tooltipId} role="tooltip">
                Données base de données
              </span>
            </h2>
          </div>
          <a className="fr-link fr-link--sm" href="/administration/demandeurs?tab=archivage">
            Voir tout
            <span className="fr-icon-arrow-right-s-line fr-icon--sm fr-ml-1v" aria-hidden="true" />
          </a>
        </div>

        {/* Badge sous-titre */}
        <div className="fr-mt-1v">
          <span
            className="fr-badge fr-badge--sm fr-badge--warning fr-badge--no-icon"
            style={{ textTransform: "uppercase" }}>
            Détail de : le demandeur n&apos;est pas éligible
          </span>
        </div>
      </div>

      {/* Tableau DSFR */}
      <div className="fr-table fr-mb-0 fr-px-4v fr-mb-4w">
        <div className="fr-table__wrapper" style={{ overflow: "hidden" }}>
          <div className="fr-table__container" style={{ overflow: "hidden" }}>
            <div className="fr-table__content">
              <table style={{ tableLayout: "fixed", width: "100%" }}>
                <caption className="sr-only">Détail des raisons d&apos;inéligibilité</caption>
                <thead>
                  <tr>
                    <th scope="col">Raison</th>
                    <th scope="col" style={{ textAlign: "right", whiteSpace: "nowrap", width: "6rem" }}>
                      Nb rép.
                    </th>
                    <th scope="col" style={{ textAlign: "right", whiteSpace: "nowrap", width: "5rem" }}>
                      Var.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {motifsAffiches.map((motif) => (
                    <tr key={motif.raison}>
                      <td
                        className="fr-text--sm"
                        title={motif.label}
                        style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>
                        {motif.label}
                      </td>
                      <td className="fr-text--sm" style={{ textAlign: "right" }}>
                        <strong>{motif.count.toLocaleString("fr-FR")}</strong> ({motif.pourcentage}%)
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <VariationBadge variation={motif.variation} />
                      </td>
                    </tr>
                  ))}

                  {/* Ligne "Autre" pour les motifs restants */}
                  {autresCount > 0 && (
                    <tr>
                      <td className="fr-text--sm">Autre</td>
                      <td className="fr-text--sm" style={{ textAlign: "right" }}>
                        <strong>{autresCount.toLocaleString("fr-FR")}</strong> ({autresPourcentage}%)
                      </td>
                      <td />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
