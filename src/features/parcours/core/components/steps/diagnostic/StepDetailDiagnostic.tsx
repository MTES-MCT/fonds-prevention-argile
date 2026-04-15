"use client";

import Link from "next/link";
import { useTransition, useState } from "react";
import { isStepBefore, Step } from "../../../domain";
import { useParcours } from "../../../context/useParcours";
import { DSStatus } from "@/features/parcours/dossiers-ds/domain";
import { envoyerDossierDiagnostic } from "../../../actions/diagnostic.actions";

export default function StepDetailDiagnostic() {
  const { currentStep, getDossierUrl, lastDSStatus, refresh } = useParcours();

  const dsUrl = getDossierUrl(Step.DIAGNOSTIC);

  const isStepActive = currentStep === Step.DIAGNOSTIC;
  const isStepBeforeCurrent = currentStep ? isStepBefore(currentStep, Step.DIAGNOSTIC) : false;
  const isStepAfterCurrent = currentStep
    ? !isStepBefore(currentStep, Step.DIAGNOSTIC) && currentStep !== Step.DIAGNOSTIC
    : false;

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await envoyerDossierDiagnostic();
      if (!result.success) {
        setError(result.error || "Erreur lors de la création du dossier");
        return;
      }
      await refresh();
      if (result.data.dossierUrl) {
        window.open(result.data.dossierUrl, "_blank", "noopener,noreferrer");
      }
    });
  };

  return (
    <div className="fr-card">
      <div className="fr-card__body fr-py-4w">
        {/* Badge conditionnel */}
        {isStepBeforeCurrent && (
          <p
            className="fr-badge fr-mb-2w fr-icon-arrow-right-s-line-double fr-text--disabled-grey fr-badge--icon-left"
            style={{ color: "var(--text-disabled-grey)" }}>
            A Venir
          </p>
        )}

        {isStepActive && (lastDSStatus === DSStatus.NON_ACCESSIBLE || lastDSStatus === DSStatus.EN_CONSTRUCTION) && (
          <span className="fr-badge fr-text--sm fr-badge--new fr-mb-2w">A faire</span>
        )}

        {isStepActive && lastDSStatus === DSStatus.EN_INSTRUCTION && (
          <span className="fr-badge fr-text--sm fr-badge--info fr-mb-2w">En instruction</span>
        )}

        {((isStepActive && lastDSStatus === DSStatus.ACCEPTE) || isStepAfterCurrent) && (
          <span className="fr-badge fr-text--sm fr-badge--success fr-mb-2w">Diagnostic validé</span>
        )}

        {isStepActive && lastDSStatus === DSStatus.REFUSE && (
          <span className="fr-badge fr-text--sm fr-badge--error fr-mb-2w">Diagnostic refusé</span>
        )}

        {/* Titre avec couleur conditionnelle */}
        <h5
          className={isStepActive ? "text-left fr-text-label--blue-france" : "text-left fr-text--disabled"}
          style={isStepActive ? undefined : { color: "var(--text-disabled-grey)" }}>
          3. Diagnostic
        </h5>

        {/* Texte si étape précédente */}
        {isStepBeforeCurrent && (
          <>
            <p style={{ color: "var(--text-disabled-grey)" }}>Démarrer le diagnostic et communiquer les résultats.</p>
            <div style={{ color: "var(--text-disabled-grey)" }}>
              <p className="fr-text--xs">
                Préparez les pièces nécessaires{" "}
                <span className="fr-icon-arrow-right-line fr-icon--sm" aria-hidden="true" />
              </p>
            </div>
          </>
        )}

        {/* Contenu si étape active */}
        {isStepActive && (
          <>
            {(lastDSStatus === DSStatus.NON_ACCESSIBLE || lastDSStatus === DSStatus.EN_CONSTRUCTION) && (
              <>
                <p>Démarrer le diagnostic et communiquer les résultats</p>
                {dsUrl ? (
                  <Link
                    href={dsUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="fr-btn fr-text--sm fr-btn--icon-right fr-icon-external-link-line">
                    Transmettre mon diagnostic
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleClick}
                    disabled={isPending}
                    className="fr-btn fr-text--sm fr-btn--icon-right fr-icon-external-link-line">
                    {isPending ? "Création en cours..." : "Transmettre mon diagnostic"}
                  </button>
                )}

                {error && (
                  <p className="fr-error-text fr-mt-2w" role="alert">
                    {error}
                  </p>
                )}
              </>
            )}

            {lastDSStatus === DSStatus.EN_INSTRUCTION && (
              <>
                <p>L'instructeur analyse votre diagnostic.</p>
                {dsUrl && (
                  <Link
                    href={dsUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="fr-btn fr-btn--secondary fr-text--sm fr-btn--icon-right fr-icon-arrow-right-s-line">
                    Voir mon diagnostic
                  </Link>
                )}
              </>
            )}

            {lastDSStatus === DSStatus.ACCEPTE && (
              <>
                <p>Votre diagnostic a été validé.</p>
                {dsUrl && (
                  <Link
                    href={dsUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="fr-btn fr-btn--secondary fr-text--sm fr-btn--icon-right fr-icon-arrow-right-s-line">
                    Voir mon diagnostic
                  </Link>
                )}
              </>
            )}

            {lastDSStatus === DSStatus.REFUSE && (
              <>
                <p>L'instructeur a émis un avis défavorable sur votre diagnostic.</p>
                {dsUrl && (
                  <Link
                    href={dsUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    className="fr-btn fr-btn--secondary fr-text--sm fr-btn--icon-right fr-icon-arrow-right-s-line">
                    Voir ma demande
                  </Link>
                )}
              </>
            )}
          </>
        )}

        {/* Contenu si étape suivante */}
        {isStepAfterCurrent && (
          <>
            <p>Votre diagnostic a été validé.</p>
            {dsUrl && (
              <Link
                href={dsUrl}
                rel="noopener noreferrer"
                target="_blank"
                className="fr-btn fr-btn--secondary fr-text--sm fr-btn--icon-right fr-icon-arrow-right-s-line">
                Voir mon diagnostic
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
