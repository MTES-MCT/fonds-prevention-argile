"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/features/auth/domain/value-objects";
import { ArchiveDossierModal } from "../../components/ArchiveDossierModal";

interface ArchiveDossierButtonProps {
  parcoursId: string;
}

/**
 * Bouton "Archiver le dossier" + modale d'archivage
 * Client Component wrapper pour la page détail (Server Component)
 */
export function ArchiveDossierButton({ parcoursId }: ArchiveDossierButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  function handleSuccess() {
    setIsModalOpen(false);
    router.push(ROUTES.backoffice.espaceAmo.dossiers);
  }

  return (
    <>
      <button type="button" className="fr-btn fr-btn--secondary fr-btn--sm" onClick={() => setIsModalOpen(true)}>
        <span className="fr-icon-archive-line fr-icon--sm fr-mr-2v" aria-hidden="true" />
        Archiver
      </button>

      <ArchiveDossierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        parcoursId={parcoursId}
        onSuccess={handleSuccess}
      />
    </>
  );
}
