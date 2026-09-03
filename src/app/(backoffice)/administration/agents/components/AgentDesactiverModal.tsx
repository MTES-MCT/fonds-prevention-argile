"use client";

import { useEffect, useRef, useState } from "react";
import { AgentWithPermissions } from "@/features/backoffice";
import type { ListeDiffusion } from "@/features/backoffice/administration/agents/services/listes-diffusion.service";
import ListesDiffusionImpact from "./ListesDiffusionImpact";

interface AgentDesactiverModalProps {
  modalId: string;
  onConfirm: (raison: string) => Promise<void>;
  agent: AgentWithPermissions | null;
  /** null tant que la recherche dans les listes de diffusion est en cours. */
  listes: ListeDiffusion[] | null;
  isLoading?: boolean;
}

export default function AgentDesactiverModal({
  modalId,
  onConfirm,
  agent,
  listes,
  isLoading = false,
}: AgentDesactiverModalProps) {
  const [raison, setRaison] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Purge le motif à toute fermeture (bouton, Annuler, Échap, clic en dehors) :
  // sinon il est réutilisé sur l'agent suivant.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleConceal = () => setRaison("");
    dialog.addEventListener("dsfr.conceal", handleConceal);
    return () => dialog.removeEventListener("dsfr.conceal", handleConceal);
    // `agent` conditionne le rendu du <dialog> : sans lui en dépendance, la ref
    // est encore nulle au premier passage et l'écouteur n'est jamais posé.
  }, [agent]);

  if (!agent) return null;

  const fullName = [agent.agent.givenName, agent.agent.usualName].filter(Boolean).join(" ");

  const handleConfirm = async () => {
    await onConfirm(raison);
    setRaison("");
    const modal = document.getElementById(modalId);
    if (modal && window.dsfr) {
      window.dsfr(modal).modal.conceal();
    }
  };

  return (
    <dialog ref={dialogRef} id={modalId} className="fr-modal" aria-labelledby={`${modalId}-title`}>
      <div className="fr-container fr-container--fluid fr-container-md">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
            <div className="fr-modal__body">
              <div className="fr-modal__header">
                <button
                  aria-controls={modalId}
                  title="Fermer"
                  type="button"
                  className="fr-btn--close fr-btn"
                  disabled={isLoading}>
                  Fermer
                </button>
              </div>
              <div className="fr-modal__content">
                <h1 id={`${modalId}-title`} className="fr-modal__title">
                  <span className="fr-icon-lock-line fr-icon--lg" aria-hidden="true"></span>
                  Désactiver l'agent
                </h1>
                <p>
                  Désactiver l'agent <strong>{fullName}</strong> ({agent.agent.email}) ?
                </p>
                <div className="fr-alert fr-alert--info fr-alert--sm fr-mt-2w fr-mb-2w">
                  <p>
                    Son accès au backoffice est coupé immédiatement, y compris s'il est connecté. Son nom reste affiché
                    sur les actions, commentaires et dossiers qu'il a traités. La désactivation est réversible.
                  </p>
                </div>
                <ListesDiffusionImpact listes={listes} />
                <div className="fr-input-group fr-mt-3w">
                  <label className="fr-label" htmlFor={`${modalId}-raison`}>
                    Motif (optionnel)
                    <span className="fr-hint-text">Par exemple : a quitté ses fonctions, changement de poste.</span>
                  </label>
                  <input
                    className="fr-input"
                    type="text"
                    id={`${modalId}-raison`}
                    value={raison}
                    onChange={(e) => setRaison(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="fr-modal__footer">
                <ul className="fr-btns-group fr-btns-group--right fr-btns-group--inline-lg">
                  <li>
                    <button
                      type="button"
                      className="fr-btn fr-btn--secondary"
                      aria-controls={modalId}
                      disabled={isLoading}>
                      Annuler
                    </button>
                  </li>
                  <li>
                    <button type="button" className="fr-btn" onClick={handleConfirm} disabled={isLoading}>
                      {isLoading ? "Désactivation..." : "Désactiver"}
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
