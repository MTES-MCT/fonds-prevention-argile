"use client";

import { VariationBadge } from "@/app/(backoffice)/administration/tableau-de-bord/shared/VariationBadge";
import type { DemandesArchiveesStats } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

interface DemandesArchiveesFullTableProps {
  stats: DemandesArchiveesStats;
}

export function DemandesArchiveesFullTable({ stats }: DemandesArchiveesFullTableProps) {
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
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="fr-icon-folder-2-line" style={{ color: "var(--text-label-warning)" }} aria-hidden="true" />
            <h2 className="fr-text--lg fr-mb-0" style={{ fontWeight: 700 }}>
              Demandes archivées ({stats.total.toLocaleString("fr-FR")})
            </h2>
          </div>
        </div>
        <p className="fr-text--sm fr-mb-0 fr-mt-1v" style={{ color: "var(--text-mention-grey)" }}>
          Tous les motifs les plus fréquents sur la période
        </p>
      </div>

      {/* Tableau DSFR */}
      <div className="fr-table fr-mb-0 fr-px-4v fr-mb-4w">
        <div className="fr-table__wrapper" style={{ overflow: "hidden" }}>
          <div className="fr-table__container" style={{ overflow: "hidden" }}>
            <div className="fr-table__content">
              <table>
                <caption className="sr-only">Motifs d&apos;archivage</caption>
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
                      <td className="fr-text--sm">{motif.raison}</td>
                      <td className="fr-text--sm" style={{ textAlign: "right" }}>
                        <strong>{motif.count.toLocaleString("fr-FR")}</strong> ({motif.pourcentage}%)
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <VariationBadge variation={motif.variation} invertColors />
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
