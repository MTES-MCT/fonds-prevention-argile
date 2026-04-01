"use client";

import { VariationBadge } from "@/app/(backoffice)/administration/tableau-de-bord/shared/VariationBadge";
import type { DemandesIneligiblesStats } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

interface DemandesIneligiblesFullTableProps {
  stats: DemandesIneligiblesStats;
}

export function DemandesIneligiblesFullTable({ stats }: DemandesIneligiblesFullTableProps) {
  if (stats.total === 0) {
    return null;
  }

  // Fusionner top 5 + autres pour afficher tous les motifs
  const tousMotifs = [...stats.motifs, ...stats.autresMotifs];

  return (
    <div
      style={{
        backgroundColor: "var(--background-default-grey)",
        border: "1px solid var(--border-default-grey)",
      }}>
      {/* Header */}
      <div className="fr-px-2w fr-pt-2w">
        <div className="flex items-center gap-2">
          <span
            className="fr-icon-close-circle-line"
            style={{ color: "var(--text-default-error)" }}
            aria-hidden="true"
          />
          <h2 className="fr-text--lg fr-mb-0" style={{ fontWeight: 700 }}>
            Demandes inéligibles ({stats.total.toLocaleString("fr-FR")})
          </h2>
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
              <table>
                <caption className="sr-only">Détail des raisons d&apos;inéligibilité</caption>
                <thead>
                  <tr>
                    <th scope="col">Raison</th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      Nb réponses
                    </th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      Variation
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tousMotifs.map((motif) => (
                    <tr key={motif.raison}>
                      <td className="fr-text--sm">
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
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
