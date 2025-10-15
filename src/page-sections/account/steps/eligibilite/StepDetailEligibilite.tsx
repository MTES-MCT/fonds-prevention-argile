import { useParcours } from "@/lib/parcours/hooks/useParcours";
import { DSStatus, isStepBefore, Step } from "@/lib/parcours/parcours.types";
import Link from "next/link";

export default function StepDetailEligibilite() {
  const { currentStep, lastDSStatus, getDossierUrl } = useParcours();

  // URL du dossier d'éligibilité
  const dsUrl = getDossierUrl(Step.ELIGIBILITE);

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

        {isStepActive &&
          (lastDSStatus === DSStatus.NON_ACCESSIBLE ||
            lastDSStatus === DSStatus.EN_CONSTRUCTION) && (
            <span className="fr-badge fr-text--sm fr-badge--new fr-mb-2w">
              A faire
            </span>
          )}

        {isStepActive && lastDSStatus === DSStatus.EN_INSTRUCTION && (
          <span className="fr-badge fr-text--sm fr-badge--info fr-mb-2w">
            En instruction
          </span>
        )}

        {((isStepActive && lastDSStatus === DSStatus.ACCEPTE) ||
          isStepAfterCurrent) && (
          <span className="fr-badge fr-text--sm fr-badge--success fr-mb-2w">
            Eligibilité confirmée
          </span>
        )}

        {isStepActive && lastDSStatus === DSStatus.REFUSE && (
          <span className="fr-badge fr-text--sm fr-badge--error fr-mb-2w">
            Eligibilité refusée
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
            {/* Contenu si en brouillon ou en construction */}
            {(lastDSStatus === DSStatus.NON_ACCESSIBLE ||
              lastDSStatus === DSStatus.EN_CONSTRUCTION) && (
              <>
                <p>
                  Remplissez le formulaire pour connaître votre éligibilité{" "}
                </p>

                {dsUrl ? (
                  <Link
                    href={dsUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="fr-btn fr-text--sm fr-btn--icon-right fr-icon-arrow-right-s-line"
                  >
                    Reprendre le formulaire
                  </Link>
                ) : (
                  <></>
                )}
              </>
            )}

            {/* Contenu si en instruction */}
            {lastDSStatus === DSStatus.EN_INSTRUCTION && (
              <>
                <p>
                  L’instructeur analyse vos réponses afin de vous donner son
                  avis.
                </p>

                {dsUrl ? (
                  <Link
                    href={dsUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="fr-btn fr-btn--secondary fr-text--sm  fr-btn--icon-right fr-icon-arrow-right-s-line"
                  >
                    Voir mes réponses
                  </Link>
                ) : (
                  <></>
                )}
              </>
            )}

            {/* Contenu si accepté ou si étape suivante */}
            {lastDSStatus === DSStatus.ACCEPTE && (
              <>
                <p>
                  L’instructeur analyse vos réponses afin de vous donner son
                  avis.
                </p>

                {dsUrl ? (
                  <Link
                    href={dsUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="fr-btn fr-btn--secondary fr-text--sm  fr-btn--icon-right fr-icon-arrow-right-s-line"
                  >
                    Voir mes réponses
                  </Link>
                ) : (
                  <></>
                )}
              </>
            )}

            {/* Contenu si refusé */}
            {lastDSStatus === DSStatus.REFUSE && (
              <>
                <p>
                  L’instructeur a analysé vos réponses et a émis un avis
                  défavorable.
                </p>

                {dsUrl ? (
                  <Link
                    href={dsUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="fr-btn fr-btn--secondary fr-text--sm  fr-btn--icon-right fr-icon-arrow-right-s-line"
                  >
                    Voir ma demande
                  </Link>
                ) : (
                  <></>
                )}
              </>
            )}
          </>
        )}

        {/* Contenu si étape suivante */}
        {isStepAfterCurrent && (
          <>
            <p>
              L’instructeur analyse vos réponses afin de vous donner son avis.
            </p>

            {dsUrl ? (
              <Link
                href={dsUrl}
                rel="noopener noreferrer"
                target="_blank"
                className="fr-btn fr-btn--secondary fr-text--sm  fr-btn--icon-right fr-icon-arrow-right-s-line"
              >
                Voir mes réponses
              </Link>
            ) : (
              <></>
            )}
          </>
        )}
      </div>
    </div>
  );
}
