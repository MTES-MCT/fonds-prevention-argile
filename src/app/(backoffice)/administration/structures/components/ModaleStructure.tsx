"use client";

import type { ReactNode } from "react";
import type { AgentDeStructure } from "@/features/backoffice";

interface ModaleStructureProps {
  modalId: string;
  titre: string;
  erreur: string | null;
  libelleConfirmation: string;
  libelleEnCours: string;
  confirmationPossible: boolean;
  onConfirm: () => void;
  isLoading: boolean;
  large?: boolean;
  children: ReactNode;
}

/** Un agent désactivé change aussi de droits : il les retrouvera à sa réactivation. */
export function nommerAgents(agents: AgentDeStructure[]): string {
  return agents
    .map((agent) => `${agent.nomComplet || agent.email}${agent.desactive ? " (désactivé, à sa réactivation)" : ""}`)
    .join(", ");
}

// Toujours monté : DSFR n'ouvre au premier clic qu'un dialogue présent quand il enregistre le bouton.
export default function ModaleStructure({
  modalId,
  titre,
  erreur,
  libelleConfirmation,
  libelleEnCours,
  confirmationPossible,
  onConfirm,
  isLoading,
  large = false,
  children,
}: ModaleStructureProps) {
  return (
    <dialog id={modalId} className="fr-modal" aria-labelledby={`${modalId}-title`}>
      <div className="fr-container fr-container--fluid fr-container-md">
        <div className="fr-grid-row fr-grid-row--center">
          <div className={large ? "fr-col-12 fr-col-md-10 fr-col-lg-8" : "fr-col-12 fr-col-md-8 fr-col-lg-6"}>
            <div className="fr-modal__body">
              <div className="fr-modal__header">
                <button aria-controls={modalId} title="Fermer" type="button" className="fr-btn--close fr-btn">
                  Fermer
                </button>
              </div>
              <div className="fr-modal__content">
                <h1 id={`${modalId}-title`} className="fr-modal__title">
                  {titre}
                </h1>
                {children}
                {erreur && (
                  <div className="fr-alert fr-alert--error fr-alert--sm fr-mt-2w" role="alert">
                    <p>{erreur}</p>
                  </div>
                )}
              </div>
              <div className="fr-modal__footer">
                <ul className="fr-btns-group fr-btns-group--right fr-btns-group--inline-lg">
                  <li>
                    <button type="button" className="fr-btn fr-btn--secondary" aria-controls={modalId}>
                      Annuler
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="fr-btn"
                      onClick={onConfirm}
                      disabled={isLoading || !confirmationPossible}>
                      {isLoading ? libelleEnCours : libelleConfirmation}
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
