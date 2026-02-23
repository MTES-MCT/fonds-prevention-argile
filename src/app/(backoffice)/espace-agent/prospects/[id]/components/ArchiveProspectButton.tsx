"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArchiveModal } from "../../../shared/components/ArchiveModal";
import { archiveProspectAction } from "@/features/backoffice/espace-agent/prospects/actions/archive-prospect.actions";
import { ROUTES } from "@/features/auth/domain/value-objects";

interface ArchiveProspectButtonProps {
  parcoursId: string;
}

/**
 * Bouton "Archiver" avec modale de confirmation pour la page détail prospect
 */
export function ArchiveProspectButton({ parcoursId }: ArchiveProspectButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  function handleSuccess() {
    setIsOpen(false);
    router.push(ROUTES.backoffice.espaceAgent.prospects);
  }

  return (
    <>
      <button type="button" className="fr-btn fr-btn--secondary" onClick={() => setIsOpen(true)}>
        <span className="fr-icon-archive-line fr-icon--sm fr-mr-2v" aria-hidden="true" />
        Archiver
      </button>

      <ArchiveModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        parcoursId={parcoursId}
        onSuccess={handleSuccess}
        archiveAction={archiveProspectAction}
        entityLabel="prospect"
      />
    </>
  );
}
