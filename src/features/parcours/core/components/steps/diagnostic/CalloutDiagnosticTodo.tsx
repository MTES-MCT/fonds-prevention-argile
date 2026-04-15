"use client";

import Link from "next/link";
import { useTransition, useState } from "react";
import { Step } from "../../../domain";
import { useParcours } from "../../../context/useParcours";
import { envoyerDossierDiagnostic } from "../../../actions/diagnostic.actions";

export default function CalloutDiagnosticTodo() {
  const { getDossierUrl, refresh } = useParcours();
  const dsUrl = getDossierUrl(Step.DIAGNOSTIC);

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
    <div className="fr-callout fr-callout--yellow-moutarde fr-icon-info-line">
      <p className="fr-callout__title">Logement éligible ! Faites réaliser le diagnostic et soumettez-le.</p>
      <p className="fr-callout__text">
        Votre dossier est bien éligible et votre diagnostic logement peut être effectué (vous recevrez votre aide après
        instruction). Vous pouvez désormais contacter votre AMO pour trouver le bureau d’étude pour la réalisation de ce
        diagnostic. Lorsque c’est fait, n’oubliez pas de transmettre vos résultats.
      </p>

      {dsUrl ? (
        <Link
          href={dsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fr-btn fr-btn--icon-right fr-icon-external-link-line">
          Transmettre les résultats de mon diagnostic
        </Link>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          className="fr-btn fr-btn--icon-right fr-icon-external-link-line">
          {isPending ? "Création en cours..." : "Transmettre les résultats de mon diagnostic"}
        </button>
      )}

      {error && (
        <p className="fr-error-text fr-mt-2w" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
