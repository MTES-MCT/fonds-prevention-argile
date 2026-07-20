"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/features/auth/domain/value-objects";
import { ArretAccompagnementModal } from "../../../shared/components/ArretAccompagnementModal";

interface DemandeArretAlertProps {
  parcoursId: string;
  demandeurNom: string;
}

/**
 * Bandeau affiché à l'AMO mandataire quand le demandeur a demandé l'arrêt de
 * l'accompagnement : son accord est nécessaire pour que le dossier passe en autonomie.
 */
export function DemandeArretAlert({ parcoursId, demandeurNom }: DemandeArretAlertProps) {
  const router = useRouter();
  const [isArretOpen, setIsArretOpen] = useState(false);

  return (
    <>
      <div className="fr-alert fr-alert--warning fr-mb-4w">
        <h3 className="fr-alert__title">Le demandeur ne souhaite plus être accompagné</h3>
        <p>
          Vous avez indiqué être mandataire financier de ce demandeur. Par conséquent, votre accord est nécessaire pour
          stopper l&apos;accompagnement.
        </p>
        <button type="button" className="fr-btn fr-btn--sm fr-mt-2w" onClick={() => setIsArretOpen(true)}>
          Je donne ma réponse
        </button>
      </div>

      <ArretAccompagnementModal
        isOpen={isArretOpen}
        onClose={() => setIsArretOpen(false)}
        parcoursId={parcoursId}
        demandeurNom={demandeurNom}
        onArretSuccess={() => {
          setIsArretOpen(false);
          router.push(ROUTES.backoffice.espaceAmo.dossiers);
        }}
        onPoursuiteSuccess={() => {
          setIsArretOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
