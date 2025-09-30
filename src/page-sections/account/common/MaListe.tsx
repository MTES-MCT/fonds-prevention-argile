import { contentAccountPage } from "@/content";
import { useParcours } from "@/lib/parcours/hooks/useParcours";
import { Step } from "@/lib/parcours/parcours.types";
import Link from "next/link";

export default function MaListe() {
  const { currentStep, getDossierUrl } = useParcours();

  // Récupérer les URLs pour chaque étape
  const eligibiliteUrl = getDossierUrl(Step.ELIGIBILITE);
  const diagnosticUrl = getDossierUrl(Step.DIAGNOSTIC);
  const devisUrl = getDossierUrl(Step.DEVIS);
  const facturesUrl = getDossierUrl(Step.FACTURES);

  // Déterminer quels liens sont actifs selon l'étape courante
  const isDiagnosticActive =
    currentStep === Step.DIAGNOSTIC ||
    currentStep === Step.DEVIS ||
    currentStep === Step.FACTURES;

  const isDevisActive =
    currentStep === Step.DEVIS || currentStep === Step.FACTURES;

  const isFacturesActive = currentStep === Step.FACTURES;

  const getStepStatus = (step: Step) => {
    const stepOrder = [
      Step.ELIGIBILITE,
      Step.DIAGNOSTIC,
      Step.DEVIS,
      Step.FACTURES,
    ];
    const currentIndex = stepOrder.indexOf(currentStep || Step.ELIGIBILITE);
    const stepIndex = stepOrder.indexOf(step);

    return {
      isCompleted: stepIndex < currentIndex,
      isActive: stepIndex <= currentIndex,
      style:
        stepIndex < currentIndex
          ? {
              textDecoration: "line-through",
              opacity: 0.7,
              pointerEvents: "none" as const,
            }
          : {},
    };
  };

  return (
    <div className="fr-card">
      <div className="fr-card__body">
        <h2 className="fr-card__title">{contentAccountPage.ma_liste.title}</h2>
        <div className="fr-card__desc">
          <ol type="1" className="fr-list space-y-2">
            <li key="eligibilite">
              {(() => {
                const status = getStepStatus(Step.ELIGIBILITE);

                if (!status.isActive) {
                  return (
                    <a aria-disabled="true" role="link" className="fr-link">
                      Remplir le formulaire d'éligibilité et avoir une réponse
                    </a>
                  );
                }

                if (status.isCompleted) {
                  return (
                    <span className="fr-link" style={status.style}>
                      Remplir le formulaire d'éligibilité et avoir une réponse{" "}
                      <span
                        className="fr-icon-check-line"
                        aria-hidden="true"
                      ></span>
                    </span>
                  );
                }

                return (
                  <Link
                    target="_blank"
                    rel="noopener external"
                    className="fr-link"
                    href={eligibiliteUrl || "#"}
                  >
                    Remplir le formulaire d'éligibilité et avoir une réponse
                  </Link>
                );
              })()}
            </li>
            <li key="diagnostic">
              {isDiagnosticActive ? (
                <Link
                  target="_blank"
                  rel="noopener external"
                  className="fr-link"
                  href={diagnosticUrl || "#"}
                >
                  Démarrer le diagnostic
                </Link>
              ) : (
                <a aria-disabled="true" role="link" className="fr-link">
                  Démarrer le diagnostic
                </a>
              )}
            </li>
            <li key="devis">
              {isDevisActive ? (
                <Link
                  target="_blank"
                  rel="noopener external"
                  className="fr-link"
                  href={devisUrl || "#"}
                >
                  Soumettre les devis
                </Link>
              ) : (
                <a aria-disabled="true" role="link" className="fr-link">
                  Soumettre les devis
                </a>
              )}
            </li>
            <li key="factures">
              {isFacturesActive ? (
                <Link
                  target="_blank"
                  rel="noopener external"
                  className="fr-link"
                  href={facturesUrl || "#"}
                >
                  Transmettre les factures
                </Link>
              ) : (
                <a aria-disabled="true" role="link" className="fr-link">
                  Transmettre les factures
                </a>
              )}
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
