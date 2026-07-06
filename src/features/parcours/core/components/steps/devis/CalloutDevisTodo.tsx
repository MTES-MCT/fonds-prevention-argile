"use client";

import Link from "next/link";
import { useTransition, useState } from "react";
import { Step } from "../../../domain";
import { useParcours } from "../../../context/useParcours";
import { envoyerDossierDevis } from "../../../actions/devis.actions";

export default function CalloutDevisTodo() {
  const { getDossierUrl, refresh } = useParcours();
  const dsUrl = getDossierUrl(Step.DEVIS);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await envoyerDossierDevis();
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
    <div className="fr-callout fr-callout--yellow-moutarde fr-icon-checkbox-circle-line">
      <p className="fr-callout__title">Diagnostic validé ! Faites réaliser vos devis.</p>
      <p className="fr-callout__text">
        Votre diagnostic a été accepté. Vous pouvez désormais faire réaliser vos devis de travaux et les transmettre
        pour accord avant de démarrer les travaux.
      </p>

      {dsUrl ? (
        <Link
          href={dsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="fr-btn fr-btn--icon-right fr-icon-external-link-line">
          Transmettre mes devis
        </Link>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={isPending}
          className="fr-btn fr-btn--icon-right fr-icon-external-link-line">
          {isPending ? "Création en cours..." : "Transmettre mes devis"}
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
