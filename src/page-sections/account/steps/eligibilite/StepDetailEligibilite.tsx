import { useParcours } from "@/lib/parcours/hooks/useParcours";
import { DSStatus, Step } from "@/lib/parcours/parcours.types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default function StepDetailEligibilite() {
  const { currentStep, getDossierUrl, dossiers } = useParcours();
  const dsUrl = getDossierUrl(Step.ELIGIBILITE);

  // Récupérer le dossier d'éligibilité
  const dossierEligibilite = dossiers?.find((d) => d.step === Step.ELIGIBILITE);

  // Date de soumission du dossier
  const dossierSubmittedDate = dossierEligibilite?.submittedAt;

  // Statut du dossier
  const dsStatus = dossierEligibilite?.dsStatus;

  // Vérifier si l'étape est active (on est à l'étape éligibilité)
  const isActive = currentStep === Step.ELIGIBILITE;

  // Vérifier si on est après l'étape éligibilité
  const isAfterEligibilite = currentStep && currentStep > Step.ELIGIBILITE;

  // Déterminer l'état d'affichage
  const getDisplayState = () => {
    // Si on est après l'étape éligibilité ou si le statut est accepté
    if (isAfterEligibilite || dsStatus === DSStatus.ACCEPTE) {
      return "confirmed";
    }

    // Si on est à l'étape éligibilité
    if (isActive) {
      if (dsStatus === DSStatus.EN_INSTRUCTION) {
        return "instruction";
      }
      if (dsStatus === DSStatus.EN_CONSTRUCTION) {
        return "construction";
      }
    }

    // Par défaut, non accessible
    return "notAccessible";
  };

  const displayState = getDisplayState();

  return (
    <div className="fr-card">
      <div className="fr-card__body fr-py-4w">
        {/* Badge conditionnel */}
        {displayState === "construction" && (
          <span className="fr-badge fr-text--sm fr-badge--new fr-mb-4w">
            En construction
          </span>
        )}

        {displayState === "instruction" && (
          <span className="fr-badge fr-text--sm fr-badge--info fr-mb-4w">
            En instruction le{" "}
            {formatDate(dossierSubmittedDate?.toISOString() || "")}
          </span>
        )}

        {displayState === "confirmed" && (
          <span className="fr-badge fr-text--sm fr-badge--success fr-mb-4w">
            Éligibilité confirmée
          </span>
        )}

        {displayState === "notAccessible" && (
          <span className="fr-badge fr-text--sm fr-mb-4w">À venir</span>
        )}

        {/* Titre avec couleur conditionnelle */}
        <h5
          className={
            displayState === "construction"
              ? "text-left fr-text-label--blue-france"
              : displayState === "notAccessible"
                ? "text-left fr-text--disabled"
                : "text-left"
          }
          style={
            displayState === "notAccessible"
              ? { color: "var(--text-disabled-grey)" }
              : undefined
          }
        >
          1. Éligibilité
        </h5>

        {/* Description avec couleur conditionnelle */}
        <p
          className={
            displayState === "notAccessible" ? "fr-text--disabled" : undefined
          }
          style={
            displayState === "notAccessible"
              ? { color: "var(--text-mention-grey)" }
              : undefined
          }
        >
          Ce formulaire permet de valider votre éligibilité
        </p>

        {/* Bouton ou lien selon l'état */}
        {displayState === "construction" && (
          <Link
            href={dsUrl || "#"}
            rel="noopener noreferrer"
            target="_blank"
            className="fr-btn fr-text--sm fr-btn--icon-right fr-icon-arrow-right-s-line"
          >
            Remplir le formulaire
          </Link>
        )}

        {(displayState === "instruction" || displayState === "confirmed") && (
          <Link
            href={dsUrl || "#"}
            rel="noopener noreferrer"
            target="_blank"
            className="fr-btn fr-btn--secondary fr-text--sm fr-btn--icon-right fr-icon-external-link-fill"
          >
            Voir mes réponses
          </Link>
        )}

        {displayState === "notAccessible" && (
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
