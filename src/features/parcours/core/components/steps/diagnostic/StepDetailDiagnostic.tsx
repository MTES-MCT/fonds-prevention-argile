import Link from "next/link";
import { isStepBefore, Step } from "../../../domain";
import { useParcours } from "../../../context/useParcours";
import { DSStatus } from "@/features/parcours/dossiers-ds/domain";

export default function StepDetailDiagnostic() {
  const { currentStep, getDossierUrl, lastDSStatus } = useParcours();

  // URL du dossier de diagnostic
  const dsUrl = getDossierUrl(Step.DIAGNOSTIC);

  // Vérifier si l'étape est active (on est à l'étape diagnostic)
  const isStepActive = currentStep === Step.DIAGNOSTIC;

  const isStepBeforeCurrent = currentStep
    ? isStepBefore(currentStep, Step.DIAGNOSTIC)
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
            <span className="fr-badge fr-text--sm fr-badge--new fr-mb-4w">
              A faire
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
          3. Diagnostic
        </h5>

        {/* Texte si etape précédente */}
        {isStepBeforeCurrent && (
          <>
            <p style={{ color: "var(--text-disabled-grey)" }}>
              Démarrer le diagnostic et communiquer les résultats.
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
            <p>Démarrer le diagnostic et communiquer les résultats</p>
            <Link
              href={dsUrl ?? "#"}
              rel="noopener noreferrer"
              target="_blank"
              className="fr-btn text-white fr-text--sm fr-btn--icon-right fr-icon-arrow-right-s-line"
            >
              Transmettre mon diagnostic
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
