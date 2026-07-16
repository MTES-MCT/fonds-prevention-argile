"use client";

import { useEffect, useRef, useState, useId } from "react";
import {
  arreterAccompagnementAction,
  refuserArretAccompagnementAction,
} from "@/features/backoffice/espace-agent/dossiers/actions";
import {
  RAISONS_ARRET_ACCOMPAGNEMENT,
  RAISON_ARRET_AUTRE,
} from "@/features/backoffice/espace-agent/dossiers/domain/arret-accompagnement";

type Choix = "arret" | "poursuite";

interface ArretAccompagnementModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcoursId: string;
  demandeurNom: string;
  /** Succès d'un arrêt : l'AMO perd l'accès au dossier, l'appelant doit rediriger. */
  onArretSuccess: () => void;
  /** Succès d'un refus : le dossier reste accompagné, un simple refresh suffit. */
  onPoursuiteSuccess: () => void;
}

/**
 * Choix de l'AMO sur l'arrêt de l'accompagnement : cesser (avec raisons) ou poursuivre.
 * Sert à la fois à l'initiative propre de l'AMO et à la réponse à une demande du demandeur.
 */
export function ArretAccompagnementModal({
  isOpen,
  onClose,
  parcoursId,
  demandeurNom,
  onArretSuccess,
  onPoursuiteSuccess,
}: ArretAccompagnementModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const uniqueId = useId();
  const modalId = `modal-arret-accompagnement-${uniqueId}`;

  const [choix, setChoix] = useState<Choix | "">("");
  const [raisons, setRaisons] = useState<string[]>([]);
  const [precisionAutre, setPrecisionAutre] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modalInstance = (window as any).dsfr?.(dialog)?.modal;
    if (!modalInstance) return;
    if (isOpen) modalInstance.disclose();
    else modalInstance.conceal();
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleConceal = () => onClose();
    dialog.addEventListener("dsfr.conceal", handleConceal);
    return () => dialog.removeEventListener("dsfr.conceal", handleConceal);
  }, [onClose]);

  function toggleRaison(raison: string, checked: boolean) {
    setRaisons((prev) => (checked ? [...prev, raison] : prev.filter((r) => r !== raison)));
    if (raison === RAISON_ARRET_AUTRE && !checked) setPrecisionAutre("");
  }

  const isAutreChecked = raisons.includes(RAISON_ARRET_AUTRE);

  async function handleConfirm() {
    setError(null);

    if (!choix) {
      setError("Veuillez sélectionner une réponse");
      return;
    }

    if (choix === "poursuite") {
      setIsSubmitting(true);
      try {
        const result = await refuserArretAccompagnementAction(parcoursId);
        if (result.success) onPoursuiteSuccess();
        else setError(result.error || "Une erreur est survenue");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (raisons.length === 0) {
      setError("Veuillez sélectionner au moins une raison");
      return;
    }
    if (isAutreChecked && precisionAutre.trim().length < 10) {
      setError("Veuillez préciser la raison en au moins 10 caractères");
      return;
    }

    const payload = raisons.map((r) => (r === RAISON_ARRET_AUTRE ? `Autre : ${precisionAutre.trim()}` : r));

    setIsSubmitting(true);
    try {
      const result = await arreterAccompagnementAction(parcoursId, payload);
      if (result.success) onArretSuccess();
      else setError(result.error || "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <dialog ref={dialogRef} id={modalId} className="fr-modal" aria-labelledby={`${modalId}-title`}>
      <div className="fr-container fr-container--fluid fr-container-md">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-10 fr-col-lg-8">
            <div className="fr-modal__body">
              <div className="fr-modal__header">
                <button aria-controls={modalId} title="Fermer" type="button" className="fr-btn--close fr-btn">
                  Fermer
                </button>
              </div>
              <div className="fr-modal__content">
                {error && (
                  <div className="fr-alert fr-alert--error fr-alert--sm fr-mb-2w">
                    <p>{error}</p>
                  </div>
                )}

                <h1 id={`${modalId}-title`} className="fr-modal__title">
                  <span className="fr-icon-arrow-right-line fr-icon--lg fr-mr-1w" aria-hidden="true" />
                  Arrêt de l&apos;accompagnement de {demandeurNom}
                </h1>

                <fieldset className="fr-fieldset" aria-labelledby={`${modalId}-choix-legend`}>
                  <legend className="fr-fieldset__legend fr-text--bold" id={`${modalId}-choix-legend`}>
                    Votre choix :
                    <span className="fr-hint-text">
                      Si vous stoppez votre accompagnement, vous ne pourrez plus agir sur ce dossier.
                    </span>
                  </legend>
                  <div className="fr-fieldset__element">
                    <div className="fr-radio-group">
                      <input
                        type="radio"
                        id={`${modalId}-arret`}
                        name={`${modalId}-choix`}
                        checked={choix === "arret"}
                        onChange={() => setChoix("arret")}
                        disabled={isSubmitting}
                      />
                      <label className="fr-label" htmlFor={`${modalId}-arret`}>
                        Je n&apos;accompagne plus ce demandeur
                      </label>
                    </div>
                  </div>
                  <div className="fr-fieldset__element">
                    <div className="fr-radio-group">
                      <input
                        type="radio"
                        id={`${modalId}-poursuite`}
                        name={`${modalId}-choix`}
                        checked={choix === "poursuite"}
                        onChange={() => setChoix("poursuite")}
                        disabled={isSubmitting}
                      />
                      <label className="fr-label" htmlFor={`${modalId}-poursuite`}>
                        Je continue d&apos;accompagner ce demandeur
                      </label>
                    </div>
                  </div>
                </fieldset>

                {choix === "arret" && (
                  <div className="fr-mt-2w">
                    <p className="fr-text--bold fr-mb-1w">
                      Merci de préciser les raisons pour lesquelles votre structure n&apos;accompagne pas le demandeur
                      <span className="fr-hint-text">Sélectionnez une ou plusieurs raisons</span>
                    </p>
                    {RAISONS_ARRET_ACCOMPAGNEMENT.map((raison) => (
                      <div key={raison}>
                        <div className="fr-checkbox-group fr-checkbox-group--sm">
                          <input
                            type="checkbox"
                            id={`${modalId}-raison-${raison}`}
                            checked={raisons.includes(raison)}
                            onChange={(e) => toggleRaison(raison, e.target.checked)}
                            disabled={isSubmitting}
                          />
                          <label className="fr-label" htmlFor={`${modalId}-raison-${raison}`}>
                            {raison}
                          </label>
                        </div>
                        {raison === RAISON_ARRET_AUTRE && isAutreChecked && (
                          <div className="fr-input-group fr-mt-1w fr-mb-1w">
                            <input
                              className="fr-input fr-input--sm"
                              type="text"
                              id={`${modalId}-precision-autre`}
                              aria-label="Précisez la raison"
                              value={precisionAutre}
                              onChange={(e) => setPrecisionAutre(e.target.value)}
                              disabled={isSubmitting}
                              placeholder="Précisez la raison (minimum 10 caractères)"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="fr-modal__footer">
                <ul className="fr-btns-group fr-btns-group--right fr-btns-group--inline-reverse fr-btns-group--inline-lg">
                  <li>
                    <button type="button" className="fr-btn" disabled={isSubmitting} onClick={handleConfirm}>
                      {isSubmitting ? "Envoi en cours..." : "Confirmer mon choix"}
                    </button>
                  </li>
                  <li>
                    <button type="button" className="fr-btn fr-btn--secondary" aria-controls={modalId}>
                      Annuler
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
