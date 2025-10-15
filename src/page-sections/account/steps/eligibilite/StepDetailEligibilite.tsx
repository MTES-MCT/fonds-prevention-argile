import { useParcours } from "@/lib/parcours/hooks/useParcours";
import { DSStatus, Status, Step } from "@/lib/parcours/parcours.types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default function StepDetailEligibilite() {
  const { currentStep, lastDSStatus, currentStatus, getDossierUrl, dossiers } = useParcours();
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

  return (
    <div className="fr-card">
      <div className="fr-card__body fr-py-4w">
        {/* Badge conditionnel */}
        {currentStatus === Status.TODO && lastDSStatus === DSStatus.NON_ACCESSIBLE && (
          <span className="fr-badge fr-text--sm fr-badge--new fr-mb-4w">
            A faire
          </span>
        )}

        {currentStatus === Status.TODO && lastDSStatus === DSStatus.EN_CONSTRUCTION && (
          <span className="fr-badge fr-text--sm fr-badge--new fr-mb-4w">
            A faire ?
          </span>
        )}

        {currentStatus === Status.EN_INSTRUCTION && (
          <span className="fr-badge fr-text--sm fr-badge--new fr-mb-4w">
            En instruction
          </span>
        )}

        {/* Titre avec couleur conditionnelle */}
        <h5
          className={
            currentStatus === Status.EN_INSTRUCTION
              ? "text-left fr-text-label--blue-france"
              : dsStatus === Status.
                ? "text-left fr-text--disabled"
                : "text-left"
          }
          style={
            displayState === "notAccessible"
              ? { color: "var(--text-disabled-grey)" }
              : undefined
          }
        >
          2. Éligibilité
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
          Validez votre éligibilité pour lancer la phase étude.
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
