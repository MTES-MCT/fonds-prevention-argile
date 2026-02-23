"use client";

import type { EligibilityChecks } from "../../domain/entities/eligibility-result.entity";

/**
 * Labels pour chaque check
 */
const CHECK_LABELS: Record<keyof EligibilityChecks, string> = {
  maison: "Maison ?",
  departementEligible: "Département éligible (03-04-24-32-36-47-54-59-63-81-82) ?",
  zoneForte: "Zone d'exposition forte ?",
  anneeConstruction: "Condition année de construction respectée ?",
  niveaux: "Pas plus de 2 niveaux ?",
  etatMaison: "Maison saine ou très peu endommagée ?",
  nonMitoyen: "Non mitoyenne ?",
  indemnisation: "Peu ou pas indemnisé au titre du RGA (dans le passé) ?",
  assurance: "Maison couverte par une assurance ?",
  proprietaireOccupant: "Propriétaire occupant ?",
  revenusEligibles: "Revenus éligibles (très modestes, modestes ou intermédiaire)",
};

/**
 * Ordre d'affichage des checks
 */
const CHECK_ORDER: (keyof EligibilityChecks)[] = [
  "maison",
  "departementEligible",
  "zoneForte",
  "anneeConstruction",
  "niveaux",
  "etatMaison",
  "nonMitoyen",
  "indemnisation",
  "assurance",
  "proprietaireOccupant",
  "revenusEligibles",
];

interface EligibilityChecksListProps {
  checks: EligibilityChecks;
  isEligible?: boolean;
  /** Si true, l'accordéon est fermé par défaut */
  defaultCollapsed?: boolean;
}

/**
 * Affiche la liste des critères d'éligibilité avec OUI/NON/—
 */
export function EligibilityChecksList({ checks, isEligible = true, defaultCollapsed = false }: EligibilityChecksListProps) {
  const isExpanded = !defaultCollapsed;

  return (
    <div className="fr-accordions-group">
      <section className="fr-accordion">
        <h3 className="fr-accordion__title">
          <button
            type="button"
            className="fr-accordion__btn"
            aria-expanded={isExpanded ? "true" : "false"}
            aria-controls="accordion-eligibility-checks">
            Détails de {isEligible ? "l\u2019\u00e9ligibilit\u00e9" : "la non-\u00e9ligibilit\u00e9"}
          </button>
        </h3>
        <div className={`fr-collapse${isExpanded ? " fr-collapse--expanded" : ""} px-4`} id="accordion-eligibility-checks">
          <div className="fr-accordion__content ">
            <ol className="fr-pl-3w">
              {CHECK_ORDER.map((key) => {
                const value = checks[key];
                return (
                  <li key={key} className="fr-mb-1w">
                    <span>{CHECK_LABELS[key]}</span> <CheckBadge value={value} />
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}

interface CheckBadgeProps {
  value: boolean | null;
}

function CheckBadge({ value }: CheckBadgeProps) {
  if (value === null) {
    return <span className="fr-badge fr-badge--sm">Non évalué</span>;
  }

  if (value) {
    return <span className="fr-badge fr-badge--sm fr-badge--success">OUI</span>;
  }

  return <span className="fr-badge fr-badge--sm fr-badge--error">NON</span>;
}
