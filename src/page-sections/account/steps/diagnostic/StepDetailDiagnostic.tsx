import { useParcours } from "@/lib/parcours/hooks/useParcours";
import { isStepBefore, Step } from "@/lib/parcours/parcours.types";
import Link from "next/link";

export default function StepDetailDiagnostic() {
  const { currentStep, getDossierUrl } = useParcours();
  const dsUrl = getDossierUrl(Step.DIAGNOSTIC);
  const isActive = currentStep === Step.DIAGNOSTIC;
  const isStepBeforeCurrent = currentStep
    ? isStepBefore(currentStep, Step.DIAGNOSTIC)
    : false;

  return (
    <div className="fr-card">
      <div className="fr-card__body fr-py-4w">
        {/* Badge conditionnel */}
        {isStepBeforeCurrent && (
          <p
            className="fr-badge fr-mb-2w fr-icon-arrow-right-s-line-double fr-text--disabled fr-badge--icon-left"
            style={{ color: "var(--text-disabled-grey)" }}
          >
            A Venir
          </p>
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
      </div>
    </div>
  );
}
