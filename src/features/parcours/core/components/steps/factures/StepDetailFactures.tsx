import Link from "next/link";
import { useParcours } from "../../../context/useParcours";
import { isStepBefore, Step } from "../../../domain";

export default function StepDetailFactures() {
  const { currentStep, getDossierUrl } = useParcours();
  const dsUrl = getDossierUrl(Step.FACTURES);
  const isActive = currentStep === Step.FACTURES;
  const isStepBeforeCurrent = currentStep
    ? isStepBefore(currentStep, Step.FACTURES)
    : false;

  return (
    <div className="fr-card">
      <div className="fr-card__body fr-py-4w">
        {/* Badge conditionnel */}
        {isStepBeforeCurrent && (
          <p
            className="fr-badge fr-mb-2w fr-icon-arrow-right-s-line-double fr-badge--icon-left"
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
          5. Travaux et paiement
        </h5>

        {/* Texte si etape précédente */}
        {isStepBeforeCurrent && (
          <>
            <p style={{ color: "var(--text-disabled-grey)" }}>
              Transmettre les factures pour être remboursé.
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
          <></>
        )}
      </div>
    </div>
  );
}
