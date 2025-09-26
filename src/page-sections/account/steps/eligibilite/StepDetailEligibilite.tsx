import { useParcours } from "@/lib/parcours/hooks/useParcours";
import { Step } from "@/lib/parcours/parcours.types";
import Link from "next/link";

export default function StepDetailEligibilite() {
  const { currentStep, getDossierUrl } = useParcours();
  const dsUrl = getDossierUrl(Step.ELIGIBILITE);

  const isActive = currentStep === Step.ELIGIBILITE;

  return (
    <div className="fr-card">
      <div className="fr-card__body fr-py-4w">
        {/* Badge conditionnel */}
        {isActive ? (
          <span className="fr-badge fr-text--sm fr-badge--new fr-mb-4w">
            En construction
          </span>
        ) : (
          <span className="fr-badge fr-text--sm fr-mb-4w">À venir</span>
        )}

        {/* Titre avec couleur conditionnelle */}
        <h5
          className={
            isActive
              ? "text-left fr-text-label--blue-france"
              : "text-left fr-text--disabled"
          }
          style={!isActive ? { color: "var(--text-disabled-grey)" } : undefined}
        >
          1. Éligibilité
        </h5>

        {/* Description avec couleur conditionnelle */}
        <p
          className={!isActive ? "fr-text--disabled" : undefined}
          style={!isActive ? { color: "var(--text-mention-grey)" } : undefined}
        >
          Ce formulaire permet de valider votre éligibilité
        </p>

        {/* Bouton ou lien selon l'état */}
        {isActive ? (
          <Link
            href={dsUrl || "#"}
            rel="noopener noreferrer"
            target="_blank"
            className="fr-btn fr-text--sm fr-btn--icon-right fr-icon-arrow-right-s-line"
          >
            Remplir le formulaire
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="fr-btn fr-text--sm fr-btn--icon-right fr-icon-arrow-right-s-line"
          >
            Remplir le formulaire
          </button>
        )}
      </div>
    </div>
  );
}
