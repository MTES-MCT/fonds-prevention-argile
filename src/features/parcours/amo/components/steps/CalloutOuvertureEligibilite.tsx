"use client";

import { useEffect, useRef, useState } from "react";
import { ouvrirEligibiliteApresValidation } from "../../actions/ouverture-eligibilite.actions";

interface CalloutOuvertureEligibiliteProps {
  refresh?: () => Promise<void>;
}

/**
 * Filet pour un parcours resté à `CHOIX_AMO` avec un logement déclaré éligible : l'étape est
 * ouverte au montage, puis le parcours rechargé — ce composant disparaît au profit du callout
 * d'éligibilité. Rattrape les dossiers figés avant que la transition soit posée à la source.
 */
export default function CalloutOuvertureEligibilite({ refresh }: CalloutOuvertureEligibiliteProps) {
  const [error, setError] = useState<string | null>(null);
  const declencheRef = useRef(false);

  useEffect(() => {
    if (declencheRef.current) return;
    declencheRef.current = true;

    ouvrirEligibiliteApresValidation().then((result) => {
      if (!result.success) {
        setError(result.error);
        return;
      }
      return refresh?.();
    });
  }, [refresh]);

  if (error) {
    return (
      <div className="fr-alert fr-alert--error">
        <p className="fr-alert__title">Nous n&apos;avons pas pu ouvrir l&apos;étape suivante</p>
        <p>Rechargez la page dans quelques instants, ou contactez-nous si le problème persiste.</p>
      </div>
    );
  }

  return (
    <div className="fr-callout">
      <p className="fr-callout__text">Préparation de votre dossier...</p>
    </div>
  );
}
