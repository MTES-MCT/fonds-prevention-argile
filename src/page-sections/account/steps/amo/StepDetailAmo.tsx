import { StatutValidationAmo } from "@/lib/parcours/amo/amo.types";
import { useParcours } from "@/lib/parcours/hooks/useParcours";
import { Step } from "@/lib/parcours/parcours.types";
import Link from "next/link";

export default function StepDetailAmo() {
  const { currentStep, statutAmo, validationAmoComplete } = useParcours();

  const isDisabled =
    currentStep !== Step.CHOIX_AMO ||
    statutAmo === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE;

  const isChooseAmoLinkDisabled =
    isDisabled || statutAmo === StatutValidationAmo.EN_ATTENTE;

  return (
    <div className="fr-card">
      <div className="fr-card__body fr-py-4w">
        {/* Badge conditionnel */}
        {!statutAmo && (
          <span className="fr-badge fr-text--sm fr-badge--new fr-mb-4w">
            A faire
          </span>
        )}

        {statutAmo === StatutValidationAmo.ACCOMPAGNEMENT_REFUSE && (
          <span className="fr-badge fr-text--sm fr-badge--new fr-mb-4w">
            A faire
          </span>
        )}

        {statutAmo === StatutValidationAmo.EN_ATTENTE && (
          <span className="fr-badge fr-text--sm fr-badge--info fr-mb-4w">
            En attente
          </span>
        )}

        {statutAmo === StatutValidationAmo.LOGEMENT_ELIGIBLE &&
          validationAmoComplete?.choisieAt && (
            <span className="fr-badge fr-text--sm fr-badge--success fr-mb-4w">
              Validé le{" "}
              {validationAmoComplete?.choisieAt.toLocaleDateString("fr-FR")}
            </span>
          )}

        {statutAmo === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE && (
          <span className="fr-badge fr-text--sm fr-badge--error fr-mb-4w">
            Non éligible
          </span>
        )}

        {/* Titre avec couleur conditionnelle */}
        <h5
          className={
            isDisabled
              ? "text-left fr-text--disabled"
              : "text-left fr-text-label--blue-france"
          }
          style={
            isDisabled ? { color: "var(--text-disabled-grey)" } : undefined
          }
        >
          1. Choisir mon AMO
        </h5>

        {/* Détail AMO */}
        {isChooseAmoLinkDisabled && (
          <>
            {validationAmoComplete && validationAmoComplete.entrepriseAmo && (
              <p className="fr-text--sm">
                {validationAmoComplete.entrepriseAmo.nom}
                <br />
                {validationAmoComplete.entrepriseAmo.emails.toString()}
                <br />
                {validationAmoComplete.entrepriseAmo.telephone}
                <br />
                {validationAmoComplete.entrepriseAmo.adresse}
              </p>
            )}
          </>
        )}

        {/* Description et Lien selon l'état */}
        {!isChooseAmoLinkDisabled && (
          <>
            <p
              className={isDisabled ? "fr-text--disabled" : undefined}
              style={
                isDisabled ? { color: "var(--text-mention-grey)" } : undefined
              }
            >
              Choisissez votre AMO parmi les choix dans le tableau ci-dessus.
            </p>

            <Link
              href="#choix-amo"
              target="_self"
              className="fr-link fr-icon-arrow-up-fill fr-link--icon-right"
              style={{
                display: "inline-flex !important",
                alignItems: "center",
                width: "fit-content",
              }}
            >
              Choisir mon AMO
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
