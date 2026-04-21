"use client";

import { useState, useTransition } from "react";
import { passerEtapeSuivante } from "../../../actions/parcours-progression.actions";
import { useParcours } from "../../../context/useParcours";

export default function CalloutEligibiliteAccepte() {
  const { refresh } = useParcours();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await passerEtapeSuivante();
      if (!result.success) {
        setError(result.error || "Erreur lors du passage à l'étape suivante");
        return;
      }
      await refresh();
    });
  };

  return (
    <div className="fr-callout fr-callout--yellow-moutarde fr-icon-time-line">
      <p className="fr-callout__title">Logement éligible ! Faites réaliser le diagnostic et soumettez-le.</p>
      <p className="fr-callout__text">
        Votre dossier est bien éligible et votre diagnostic logement peut être effectué (vous recevrez votre aide après
        instruction). Vous pouvez désormais contacter votre AMO pour trouver le bureau d’étude pour la réalisation de ce
        diagnostic. Lorsque c’est fait, n’oubliez pas de transmettre vos résultats.
      </p>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="fr-btn fr-btn--icon-right fr-icon-arrow-right-s-line">
        {isPending ? "Passage à l'étape suivante..." : "Passer au diagnostic"}
      </button>
      {error && (
        <p className="fr-error-text fr-mt-2w" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
