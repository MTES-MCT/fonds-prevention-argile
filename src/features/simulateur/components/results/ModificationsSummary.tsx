"use client";

import type { Modification } from "../../domain/services/modifications-comparison.service";

interface ModificationsSummaryProps {
  modifications: Modification[];
}

/**
 * Carte résumant les modifications faites par l'agent.
 * Affiche chaque champ modifié avec une valeur avant/après et un code couleur
 * indiquant l'impact sur l'éligibilité.
 */
export function ModificationsSummary({ modifications }: ModificationsSummaryProps) {
  if (modifications.length === 0) return null;

  return (
    <div className="border border-[var(--border-default-grey)] bg-white p-6 fr-mt-4w">
      <h3 className="fr-h6 fr-mb-2w flex items-center gap-2">
        <span className="fr-icon-info-line" aria-hidden="true" />
        Vous avez fait {modifications.length} modification{modifications.length > 1 ? "s" : ""} :
      </h3>
      <ul className="fr-raw-list fr-ml-2w">
        {modifications.map((mod) => (
          <li key={mod.label} className="fr-mb-1w flex flex-wrap items-center gap-2">
            <span className="list-disc">•</span>
            <span>{mod.label}</span>
            <span className="fr-badge fr-badge--sm fr-badge--success">{mod.beforeDisplay}</span>
            <span aria-hidden="true">→</span>
            <span className={`fr-badge fr-badge--sm ${mod.isEligible ? "fr-badge--success" : "fr-badge--error"}`}>
              {mod.afterDisplay}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
