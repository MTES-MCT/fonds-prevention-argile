"use client";

import {
  QUALIFICATION_ACTIONS,
  QUALIFICATION_DECISIONS,
  RAISONS_INELIGIBILITE,
} from "@/features/backoffice/espace-agent/prospects/domain/types";
import type { QualificationDecision } from "@/features/backoffice/espace-agent/prospects/domain/types";
import { formatRelativeTimeShort } from "@/shared/utils/date.utils";

interface QualificationCalloutProps {
  decision: QualificationDecision;
  actionsRealisees: string[];
  raisonsIneligibilite: string[] | null;
  note: string | null;
  agentNom: string;
  structureNom: string;
  createdAt: string;
  onRequalifier: () => void;
}

const VARIANT_CONFIG: Record<QualificationDecision, { className: string }> = {
  eligible: { className: "fr-callout--green-emeraude" },
  non_eligible: { className: "fr-callout--pink-tuile" },
  a_qualifier: { className: "" },
};

/**
 * Résout le label d'une valeur stockée.
 * Gère le format "autre:précision" en affichant "Autre — précision".
 */
function getLabelForValue(list: ReadonlyArray<{ value: string; label: string }>, value: string): string {
  if (value.startsWith("autre:")) {
    const precision = value.slice("autre:".length);
    return `Autre \u2014 ${precision}`;
  }
  return list.find((item) => item.value === value)?.label ?? value;
}

/**
 * Callout affichant le résultat d'une qualification de prospect.
 * Variantes : eligible (vert), non_eligible (rouge), a_qualifier (jaune).
 */
export function QualificationCallout({
  decision,
  actionsRealisees,
  raisonsIneligibilite,
  note,
  agentNom,
  structureNom,
  createdAt,
  onRequalifier,
}: QualificationCalloutProps) {
  const variant = VARIANT_CONFIG[decision];
  const decisionLabel = QUALIFICATION_DECISIONS.find((d) => d.value === decision)?.label ?? decision;
  const relativeTime = formatRelativeTimeShort(new Date(createdAt));

  // Labels des actions séparés par " - "
  const actionsLabels = actionsRealisees
    .map((a) => getLabelForValue(QUALIFICATION_ACTIONS as unknown as { value: string; label: string }[], a))
    .join(" - ");

  // Labels des raisons séparés par " - "
  const raisonsLabels =
    raisonsIneligibilite && raisonsIneligibilite.length > 0
      ? raisonsIneligibilite
          .map((r) => getLabelForValue(RAISONS_INELIGIBILITE as unknown as { value: string; label: string }[], r))
          .join(" - ")
      : null;

  return (
    <div className={`fr-callout ${variant.className}`}>
      {/* Titre = label de la décision (avec emoji) */}
      <h3 className="fr-callout__title">{decisionLabel}</h3>

      <div className="fr-callout__text">
        {/* Agent, structure, date — même format que NoteItem */}
        <div className="fr-grid-row fr-grid-row--middle fr-mb-2w">
          <div className="fr-col">
            <span className="fr-text--sm fr-mr-1v">
              Par <strong>{agentNom}</strong>
            </span>
            <span className="fr-text--xs fr-text-mention--grey" style={{ fontStyle: "italic" }}>
              {structureNom}
            </span>

            <span className="fr-text--xs fr-ml-2v fr-text-mention--grey">&bull; {relativeTime}</span>
          </div>
        </div>

        {/* Actions réalisées */}
        <p className="fr-mb-1w">
          Actions réalisées : <strong>{actionsLabels}</strong>
        </p>

        {/* Raisons d'inéligibilité (si non_eligible) */}
        {decision === "non_eligible" && raisonsLabels && (
          <p className="fr-mb-1w">
            Raisons d&apos;inéligibilité : <strong>{raisonsLabels}</strong>
          </p>
        )}

        {/* Note complémentaire */}
        {note && (
          <div className="fr-mt-2w">
            <p className="fr-mb-1w">Note complémentaire</p>
            <div
              style={{
                backgroundColor: "var(--background-contrast-grey)",
                padding: "1rem",
                borderRadius: "4px",
              }}>
              <p className="fr-mb-0">&ldquo;{note}&rdquo;</p>
            </div>
          </div>
        )}

        {/* Bouton mettre à jour */}
        <div className="fr-mt-3w">
          <button type="button" className="fr-btn" onClick={onRequalifier}>
            <span className="fr-icon-refresh-line fr-icon--sm fr-mr-1w" aria-hidden="true" />
            Mettre à jour la qualification
          </button>
        </div>
      </div>
    </div>
  );
}
