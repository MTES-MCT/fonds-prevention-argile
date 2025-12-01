"use client";

import type { AgentWithPermissions } from "@/features/backoffice/administration/domain/types";

interface AgentDeleteModalProps {
  modalId: string;
  onConfirm: () => Promise<void>;
  agent: AgentWithPermissions | null;
  isLoading?: boolean;
}

export default function AgentDeleteModal({ modalId, onConfirm, agent, isLoading = false }: AgentDeleteModalProps) {
  if (!agent) return null;

  const fullName = [agent.agent.givenName, agent.agent.usualName].filter(Boolean).join(" ");

  const handleConfirm = async () => {
    await onConfirm();
    const modal = document.getElementById(modalId);
    if (modal && window.dsfr) {
      window.dsfr(modal).modal.conceal();
    }
  };

  return (
    <dialog id={modalId} className="fr-modal" aria-labelledby={`${modalId}-title`}>
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
                  <span className="fr-icon-delete-line fr-icon--lg" aria-hidden="true"></span>
                  Supprimer l'agent
                </h1>
                <p>
                  Êtes-vous sûr de vouloir supprimer l'agent <strong>{fullName}</strong> ({agent.agent.email}) ?
                </p>
                <div className="fr-alert fr-alert--warning fr-alert--sm fr-mt-2w">
                  <p>Cette action est irréversible. L'agent ne pourra plus accéder au backoffice.</p>
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
                    <button
                      type="button"
                      className="fr-btn"
                      style={{ backgroundColor: "#c9191e", color: "white" }}
                      onClick={handleConfirm}
                      disabled={isLoading}>
                      {isLoading ? "Suppression..." : "Supprimer"}
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
