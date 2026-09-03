"use client";

import { useState } from "react";
import { AgentWithPermissions, formatTracesResume } from "@/features/backoffice";
import type { AgentTracesCount } from "@/shared/database/repositories/agents.repository";
import type { ListeDiffusion } from "@/features/backoffice/administration/agents/services/listes-diffusion.service";
import ListesDiffusionImpact from "./ListesDiffusionImpact";

interface AgentDeleteModalProps {
  modalId: string;
  onConfirm: () => Promise<void>;
  /** Bascule proposée quand l'agent a laissé un historique. */
  onDesactiver: (raison: string) => Promise<void>;
  agent: AgentWithPermissions | null;
  /** null tant que le comptage est en cours. */
  traces: AgentTracesCount | null;
  /** null tant que la recherche dans les listes de diffusion est en cours. */
  listes: ListeDiffusion[] | null;
  isLoading?: boolean;
}

export default function AgentDeleteModal({
  modalId,
  onConfirm,
  onDesactiver,
  agent,
  traces,
  listes,
  isLoading = false,
}: AgentDeleteModalProps) {
  const [raison, setRaison] = useState("");

  if (!agent) return null;

  const fullName = [agent.agent.givenName, agent.agent.usualName].filter(Boolean).join(" ");
  // Un agent dont on ignore encore l'historique n'est pas supprimable : on ne propose
  // la suppression qu'une fois le comptage revenu à zéro.
  const aUnHistorique = traces === null || traces.total > 0;

  const close = () => {
    const modal = document.getElementById(modalId);
    if (modal && window.dsfr) {
      window.dsfr(modal).modal.conceal();
    }
  };

  const handleDelete = async () => {
    await onConfirm();
    close();
  };

  const handleDesactiver = async () => {
    await onDesactiver(raison);
    setRaison("");
    close();
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

              {traces === null ? (
                <div className="fr-modal__content">
                  <h1 id={`${modalId}-title`} className="fr-modal__title">
                    Supprimer l'agent
                  </h1>
                  <p>Vérification de l'historique de {fullName}...</p>
                </div>
              ) : traces.total > 0 ? (
                <div className="fr-modal__content">
                  <h1 id={`${modalId}-title`} className="fr-modal__title">
                    <span className="fr-icon-lock-line fr-icon--lg" aria-hidden="true"></span>
                    Désactiver plutôt que supprimer
                  </h1>
                  <p>
                    <strong>{fullName}</strong> ({agent.agent.email}) a laissé un historique :{" "}
                    <strong>{formatTracesResume(traces)}</strong>.
                  </p>
                  <div className="fr-alert fr-alert--warning fr-alert--sm fr-mt-2w fr-mb-2w">
                    <p>
                      Le supprimer effacerait son nom de ces traces. La désactivation coupe son accès immédiatement et
                      conserve l'historique. Elle est réversible.
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
              ) : (
                <div className="fr-modal__content">
                  <h1 id={`${modalId}-title`} className="fr-modal__title">
                    <span className="fr-icon-delete-line fr-icon--lg" aria-hidden="true"></span>
                    Supprimer l'agent
                  </h1>
                  <p>
                    Êtes-vous sûr de vouloir supprimer l'agent <strong>{fullName}</strong> ({agent.agent.email}) ?
                  </p>
                  <div className="fr-alert fr-alert--warning fr-alert--sm fr-mt-2w">
                    <p>
                      Cet agent n'a laissé aucune trace dans les dossiers. Cette action est irréversible : il ne pourra
                      plus accéder au backoffice.
                    </p>
                  </div>
                </div>
              )}

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
                    {aUnHistorique ? (
                      <button
                        type="button"
                        className="fr-btn"
                        onClick={handleDesactiver}
                        disabled={isLoading || traces === null}>
                        {isLoading ? "Désactivation..." : "Désactiver"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="fr-btn"
                        style={{ backgroundColor: "#c9191e", color: "white" }}
                        onClick={handleDelete}
                        disabled={isLoading}>
                        {isLoading ? "Suppression..." : "Supprimer"}
                      </button>
                    )}
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
