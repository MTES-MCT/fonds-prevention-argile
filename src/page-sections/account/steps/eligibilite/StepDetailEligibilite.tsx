import { useParcours } from "@/lib/parcours/hooks/useParcours";
import {
  DSStatus,
  isStepBefore,
  Status,
  Step,
} from "@/lib/parcours/parcours.types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export default function StepDetailEligibilite() {
  const { currentStep, lastDSStatus, currentStatus, getDossierUrl, dossiers } =
    useParcours();
  const dsUrl = getDossierUrl(Step.ELIGIBILITE);

  // Récupérer le dossier d'éligibilité
  const dossierEligibilite = dossiers?.find((d) => d.step === Step.ELIGIBILITE);

  // Date de soumission du dossier
  const dossierSubmittedDate = dossierEligibilite?.submittedAt;

  // Statut du dossier
  const dsStatus = dossierEligibilite?.dsStatus;

  // Vérifier si l'étape est active (on est à l'étape éligibilité)
  const isStepActive = currentStep === Step.ELIGIBILITE;

  const isStepBeforeCurrent = currentStep
    ? isStepBefore(currentStep, Step.ELIGIBILITE)
    : false;

  const isStepAfterCurrent = currentStep
    ? !isStepBefore(currentStep, Step.ELIGIBILITE) &&
      currentStep !== Step.ELIGIBILITE
    : false;

  return (
    <div className="fr-card">
      <div className="fr-card__body fr-py-4w">
        {/* Badge conditionnel */}
        {isStepBeforeCurrent && (
          <p
            className="fr-badge fr-mb-2w fr-icon-arrow-right-s-line-double fr-text--disabled-grey fr-badge--icon-left"
            style={{ color: "var(--text-disabled-grey)" }}
          >
            A Venir
          </p>
        )}

        {isStepActive && lastDSStatus === DSStatus.NON_ACCESSIBLE && (
          <span className="fr-badge fr-text--sm fr-badge--new fr-mb-4w">
            A faire
          </span>
        )}

        {isStepActive && lastDSStatus === DSStatus.EN_CONSTRUCTION && (
          <span className="fr-badge fr-text--sm fr-badge--new fr-mb-4w">
            A faire
          </span>
        )}

        {isStepActive && currentStatus === Status.EN_INSTRUCTION && (
          <span className="fr-badge fr-text--sm fr-badge--new fr-mb-4w">
            En instruction
          </span>
        )}

        {/* Titre avec couleur conditionnelle */}
        <h5
          className={
            isStepActive
              ? "text-left fr-text-label--blue-france"
              : "text-left fr-text--disabled"
          }
          style={
            isStepActive ? undefined : { color: "var(--text-disabled-grey)" }
          }
        >
          2. Éligibilité
        </h5>

        {/* Contenu si étape précédente */}
        {isStepBeforeCurrent && (
          <>
            <p style={{ color: "var(--text-disabled-grey)" }}>
              Remplissez le formulaire pour connaître votre éligibilité.
            </p>
            <div style={{ color: "var(--text-disabled-grey)" }}>
              <p className="fr-text--xs">
                Préparez les pièces nécessaires{" "}
                <span
                  className="fr-icon-arrow-right-line fr-icon--sm"
                  aria-hidden="true"
                />
              </p>
            </div>
          </>
        )}

        {/* Contenu si étape active */}
        {isStepActive && (
          <>
            {/* Bouton ou lien selon l'état */}
            <Link
              href={dsUrl || "#"}
              rel="noopener noreferrer"
              target="_blank"
              className="fr-btn fr-text--sm fr-btn--icon-right fr-icon-arrow-right-s-line"
            >
              Remplir le formulaire
            </Link>

            {/* Lien vers le dossier d'éligibilité */}
            <Link
              href={dsUrl || "#"}
              rel="noopener noreferrer"
              target="_blank"
              className="fr-btn fr-btn--secondary fr-text--sm fr-btn--icon-right fr-icon-external-link-fill"
            >
              Voir mes réponses
            </Link>

            {/* Bouton de remplissage du formulaire */}
            <button
              type="button"
              disabled
              className="fr-btn fr-text--sm fr-btn--icon-right fr-icon-arrow-right-s-line"
            >
              Remplir le formulaire
            </button>
          </>
        )}

        {/* Contenu si étape suivante */}
        {isStepAfterCurrent && <>Après</>}
      </div>
    </div>
  );
}
