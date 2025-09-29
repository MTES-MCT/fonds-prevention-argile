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
  const isEligibiliteActive =
    currentStep === Step.ELIGIBILITE ||
    currentStep === Step.DIAGNOSTIC ||
    currentStep === Step.DEVIS ||
    currentStep === Step.FACTURES;

  const isDiagnosticActive =
    currentStep === Step.DIAGNOSTIC ||
    currentStep === Step.DEVIS ||
    currentStep === Step.FACTURES;

  const isDevisActive =
    currentStep === Step.DEVIS || currentStep === Step.FACTURES;

  const isFacturesActive = currentStep === Step.FACTURES;

  return (
    <div className="fr-card">
      <div className="fr-card__body">
        <h2 className="fr-card__title">{contentAccountPage.ma_liste.title}</h2>
        <div className="fr-card__desc">
          <ol type="1" className="fr-list space-y-2">
            <li key="eligibilite">
              {isEligibiliteActive ? (
                <Link
                  target="_blank"
                  rel="noopener external"
                  className="fr-link"
                  href={eligibiliteUrl || "#"}
                >
                  Remplir le formulaire d'éligibilité et avoir une réponse
                </Link>
              ) : (
                <a aria-disabled="true" role="link" className="fr-link">
                  Remplir le formulaire d'éligibilité et avoir une réponse
                </a>
              )}
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
