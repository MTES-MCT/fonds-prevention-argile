import Link from "next/link";
import { useParcours } from "../../../core/context/useParcours";
import { Step } from "../../../core/domain";
import { estLogementNonEligible, StatutValidationAmo } from "@/features/parcours/amo/domain/value-objects";
import { useAmoMode } from "@/features/parcours/amo/hooks";
import { AmoMode } from "@/features/parcours/amo/domain/value-objects/departements-amo";
import { ContactCard } from "@/shared/components/ContactCard/ContactCard";

export default function StepDetailAmo() {
  const { currentStep, statutAmo, validationAmoComplete, isQualifiedNonEligible } = useParcours();
  const amoMode = useAmoMode();

  // Couvre les décisions AMO (dont ACCOMPAGNEMENT_REFUSE, legacy) et les qualifications
  // non éligibles (Aller-vers ou simulation du demandeur), qui laissent statutAmo null.
  const isNonEligible = estLogementNonEligible(statutAmo, isQualifiedNonEligible);

  const isDisabled = currentStep !== Step.CHOIX_AMO || isNonEligible;

  const isChooseAmoLinkDisabled = isDisabled || statutAmo === StatutValidationAmo.EN_ATTENTE;

  // Titre adapté au mode AMO
  const isFacultatif = amoMode === AmoMode.FACULTATIF;
  const cardTitle = isFacultatif ? "2. Accompagnement" : "2. Mon AMO";

  // SANS_AMO : le demandeur a explicitement renoncé à un AMO. Pas de carte AMO à afficher.
  const isSansAmo = statutAmo === StatutValidationAmo.SANS_AMO;

  return (
    <div className="fr-card">
      <div className="fr-card__body fr-py-4w">
        {/* Badge conditionnel. « A faire » uniquement à l'étape choix_amo  */}
        {currentStep === Step.CHOIX_AMO && !statutAmo && !isNonEligible && (
          <span className="fr-badge fr-text--sm fr-badge--new fr-mb-2w">A faire</span>
        )}

        {statutAmo === StatutValidationAmo.EN_ATTENTE && !isNonEligible && (
          <span className="fr-badge fr-text--sm fr-badge--info fr-mb-2w">En attente</span>
        )}

        {statutAmo === StatutValidationAmo.LOGEMENT_ELIGIBLE && validationAmoComplete?.choisieAt && !isNonEligible && (
          <span className="fr-badge fr-text--sm fr-badge--success fr-mb-2w">
            Validé le {validationAmoComplete?.choisieAt.toLocaleDateString("fr-FR")}
          </span>
        )}

        {isNonEligible && <span className="fr-badge fr-text--sm fr-badge--error fr-mb-2w">Non éligible</span>}

        {isSansAmo && !isNonEligible && <span className="fr-badge fr-text--sm fr-badge--success fr-mb-2w">Validé</span>}

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
              <div className="fr-grid-row">
                <ContactCard
                  id={validationAmoComplete.entrepriseAmo.id}
                  nom={validationAmoComplete.entrepriseAmo.nom}
                  emails={validationAmoComplete.entrepriseAmo.emails}
                  telephone={validationAmoComplete.entrepriseAmo.telephone}
                  adresse={validationAmoComplete.entrepriseAmo.adresse}
                  horaires={validationAmoComplete.entrepriseAmo.horaires}
                  selectable={false}
                  colSize="full"
                />
              </div>
            )}
          </>
        )}

        {/* Mention SANS_AMO : le demandeur gère ses démarches seul */}
        {isSansAmo && !isNonEligible && (
          <p className="fr-text--sm">Vous avez choisi de gérer vos démarches sans accompagnement.</p>
        )}

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
