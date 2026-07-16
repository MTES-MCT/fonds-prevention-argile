"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/features/auth/domain/value-objects";
import { ArchiveModal } from "../../../shared/components/ArchiveModal";
import { ArretAccompagnementModal } from "../../../shared/components/ArretAccompagnementModal";
import { ActionMenu } from "../../../shared/components";

interface GererDossierMenuProps {
  parcoursId: string;
  demandeurNom: string;
  /** L'entrée « Ne plus accompagner » n'a de sens que pour l'AMO responsable du dossier. */
  peutArreterAccompagnement: boolean;
  /** Ouvre la modale d'arrêt au montage (entrée depuis le bandeau « Je donne ma réponse »). */
  ouvrirArretAuMontage?: boolean;
}

/**
 * Menu « Gérer » du détail dossier : Archiver + Ne plus accompagner.
 * Remplace l'ancien bouton « Archiver » seul.
 */
export function GererDossierMenu({
  parcoursId,
  demandeurNom,
  peutArreterAccompagnement,
  ouvrirArretAuMontage = false,
}: GererDossierMenuProps) {
  const router = useRouter();
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isArretOpen, setIsArretOpen] = useState(ouvrirArretAuMontage);

  // Après archivage comme après arrêt, l'agent n'a plus le dossier dans son périmètre.
  function backToListing() {
    setIsArchiveOpen(false);
    setIsArretOpen(false);
    router.push(ROUTES.backoffice.espaceAmo.dossiers);
  }

  return (
    <>
      <ActionMenu
        ariaLabel="Gérer le dossier"
        triggerLabel="Gérer"
        triggerClassName="fr-btn fr-btn--secondary fr-btn--sm fr-icon-arrow-down-s-line fr-btn--icon-right"
        items={[
          { label: "Archiver", icon: "fr-icon-archive-line", onClick: () => setIsArchiveOpen(true) },
          ...(peutArreterAccompagnement
            ? [
                {
                  label: "Ne plus accompagner",
                  icon: "fr-icon-close-circle-line",
                  variant: "danger" as const,
                  onClick: () => setIsArretOpen(true),
                },
              ]
            : []),
        ]}
      />

      <ArchiveModal
        isOpen={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        parcoursId={parcoursId}
        onSuccess={backToListing}
      />

      <ArretAccompagnementModal
        isOpen={isArretOpen}
        onClose={() => setIsArretOpen(false)}
        parcoursId={parcoursId}
        demandeurNom={demandeurNom}
        onArretSuccess={backToListing}
        onPoursuiteSuccess={() => {
          setIsArretOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
