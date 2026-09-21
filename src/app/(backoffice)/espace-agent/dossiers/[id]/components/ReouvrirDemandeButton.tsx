"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReouvrirDemandeModal } from "../../../shared/components/ReouvrirDemandeModal";

interface ReouvrirDemandeButtonProps {
  parcoursId: string;
}

/**
 * Bouton "Ré-ouvrir la demande" + modale de confirmation, pour un dossier refusé
 * par l'AMO. Client Component wrapper pour la page détail (Server Component) ; la
 * visibilité (rôle) est décidée côté serveur, le périmètre fin côté action.
 */
export function ReouvrirDemandeButton({ parcoursId }: ReouvrirDemandeButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  // La demande redevient `en_attente` : l'écran de décision est sur /demandes/[id], pas ici.
  // Sans cette redirection, l'agent restait sur une page sans bouton accepter/refuser.
  function handleSuccess(redirectTo: string | null) {
    setIsModalOpen(false);
    if (redirectTo) router.push(redirectTo);
    else router.refresh();
  }

  return (
    <>
      <button type="button" className="fr-btn fr-btn--secondary fr-btn--sm" onClick={() => setIsModalOpen(true)}>
        <span className="fr-icon-refresh-line fr-icon--sm fr-mr-2v" aria-hidden="true" />
        Ré-ouvrir la demande
      </button>

      <ReouvrirDemandeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        parcoursId={parcoursId}
        onSuccess={handleSuccess}
      />
    </>
  );
}
