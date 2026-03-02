import {
  QUALIFICATION_ACTIONS,
  QUALIFICATION_DECISIONS,
  RAISONS_INELIGIBILITE,
} from "@/features/backoffice/espace-agent/prospects/domain/types";
import type { QualificationDecision } from "@/features/backoffice/espace-agent/prospects/domain/types";
import { formatRelativeTimeShort } from "@/shared/utils/date.utils";

interface QualificationAllersVersProps {
  decision: QualificationDecision;
  actionsRealisees: string[];
  raisonsIneligibilite: string[] | null;
  note: string | null;
  agentNom: string;
  structureNom: string;
  createdAt: Date;
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
 * Bloc lecture seule affichant la qualification Aller-vers d'un prospect,
 * visible sur la page dossier AMO.
 */
export function QualificationAllersVers({
  decision,
  actionsRealisees,
  raisonsIneligibilite,
  note,
  agentNom,
  structureNom,
  createdAt,
}: QualificationAllersVersProps) {
  const variant = VARIANT_CONFIG[decision];
  const decisionLabel = QUALIFICATION_DECISIONS.find((d) => d.value === decision)?.label ?? decision;
  const relativeTime = formatRelativeTimeShort(createdAt);

  const actionsLabels = actionsRealisees
    .map((a) => getLabelForValue(QUALIFICATION_ACTIONS as unknown as { value: string; label: string }[], a))
    .join(" - ");

  const raisonsLabels =
    raisonsIneligibilite && raisonsIneligibilite.length > 0
      ? raisonsIneligibilite
          .map((r) => getLabelForValue(RAISONS_INELIGIBILITE as unknown as { value: string; label: string }[], r))
          .join(" - ")
      : null;

  return (
    <div className="fr-card">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <div className="fr-mb-2w">
            <h3 className="fr-card__title fr-mb-1v">
              <span className="fr-icon-clipboard-line fr-mr-2v" aria-hidden="true"></span>
              Qualification Aller-vers
            </h3>
            <p className="fr-text--sm fr-text-mention--grey fr-mb-0">Informations fournies par l&apos;Aller-vers</p>
          </div>

          <div className={`fr-callout ${variant.className}`}>
            <h4 className="fr-callout__title">{decisionLabel}</h4>

            <div className="fr-callout__text">
              {/* Agent, structure, date */}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
