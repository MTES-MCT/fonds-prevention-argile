import Link from "next/link";
import { useParcours } from "../../../core/context/useParcours";
import { Step } from "../../../core/domain";
import { StatutValidationAmo } from "@/features/parcours/amo/domain/value-objects";
import { useAmoMode } from "@/features/parcours/amo/hooks";
import { AmoMode } from "@/features/parcours/amo/domain/value-objects/departements-amo";

export default function StepDetailAmo() {
  const { currentStep, statutAmo, validationAmoComplete } = useParcours();
  const amoMode = useAmoMode();

  // ACCOMPAGNEMENT_REFUSE n'est plus produit côté UI (option retirée du backoffice AMO) mais
  // peut subsister sur d'anciens records → on le traite comme LOGEMENT_NON_ELIGIBLE en lecture.
  const isRefuse =
    statutAmo === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE || statutAmo === StatutValidationAmo.ACCOMPAGNEMENT_REFUSE;

  const isDisabled = currentStep !== Step.CHOIX_AMO || isRefuse;

  const isChooseAmoLinkDisabled = isDisabled || statutAmo === StatutValidationAmo.EN_ATTENTE;

  // Titre adapté au mode AMO
  const isFacultatif = amoMode === AmoMode.FACULTATIF;
  const cardTitle = isFacultatif ? "1. Choix de l'accompagnement" : "1. Mon AMO";

  // SANS_AMO : le demandeur a explicitement renoncé à un AMO. Pas de carte AMO à afficher.
  const isSansAmo = statutAmo === StatutValidationAmo.SANS_AMO;

  return (
    <div className="fr-card">
      <div className="fr-card__body fr-py-4w">
        {/* Badge conditionnel */}
        {!statutAmo && <span className="fr-badge fr-text--sm fr-badge--new fr-mb-2w">A faire</span>}

        {statutAmo === StatutValidationAmo.EN_ATTENTE && (
          <span className="fr-badge fr-text--sm fr-badge--info fr-mb-2w">En attente</span>
        )}

        {statutAmo === StatutValidationAmo.LOGEMENT_ELIGIBLE && validationAmoComplete?.choisieAt && (
          <span className="fr-badge fr-text--sm fr-badge--success fr-mb-2w">
            Validé le {validationAmoComplete?.choisieAt.toLocaleDateString("fr-FR")}
          </span>
        )}

        {isRefuse && <span className="fr-badge fr-text--sm fr-badge--error fr-mb-2w">Non éligible</span>}

        {isSansAmo && <span className="fr-badge fr-text--sm fr-badge--success fr-mb-2w">Validé</span>}

        {/* Titre avec couleur conditionnelle */}
        <h5
          className={isDisabled ? "text-left fr-text--disabled" : "text-left fr-text-label--blue-france"}
          style={isDisabled ? { color: "var(--text-disabled-grey)" } : undefined}>
          {cardTitle}
        </h5>

        {/* Détail AMO */}
        {isChooseAmoLinkDisabled && !isSansAmo && (
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

        {/* Mention SANS_AMO : le demandeur gère ses démarches seul */}
        {isSansAmo && <p className="fr-text--sm">Vous avez choisi de gérer vos démarches sans accompagnement.</p>}

        {/* Description et Lien selon l'état */}
        {!isChooseAmoLinkDisabled && !isSansAmo && (
          <>
            <p
              className={isDisabled ? "fr-text--disabled" : undefined}
              style={isDisabled ? { color: "var(--text-mention-grey)" } : undefined}>
              Contactez puis indiquez votre AMO parmi les choix ci-dessus.
            </p>

            <Link
              href="#choix-amo"
              target="_self"
              className="fr-link fr-icon-arrow-up-fill fr-link--icon-right"
              style={{
                display: "inline-flex !important",
                alignItems: "center",
                width: "fit-content",
              }}>
              Choisir mon AMO
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
