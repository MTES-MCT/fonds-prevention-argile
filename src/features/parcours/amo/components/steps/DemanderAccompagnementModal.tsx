"use client";

import { useEffect, useRef, useState } from "react";
import { demanderMonAccompagnement } from "../../actions/demande-accompagnement.actions";
import { getAmosDisponibles } from "../../actions/amo-disponibles.actions";
import type { Amo } from "../../domain/entities";
import { useDsfrModal } from "@/shared/hooks";
import { ChoixAmoListe } from "./ChoixAmoListe";

const MODAL_ID = "modal-demander-accompagnement";

interface DemanderAccompagnementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Confirmation de la demande d'accompagnement par un AMO, après avoir choisi l'autonomie.
 * Même mécanique que le "Oui" de `CalloutChoixAccompagnement` : l'AMO du territoire, ou celle
 * que le demandeur choisit quand plusieurs le couvrent.
 */
export function DemanderAccompagnementModal({ isOpen, onClose }: DemanderAccompagnementModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amos, setAmos] = useState<Amo[]>([]);
  const [amoChoisie, setAmoChoisie] = useState<string | null>(null);
  const choixRequis = amos.length > 1;

  useDsfrModal(dialogRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    // Chaque ouverture repart de zéro : un choix ou une erreur d'une ouverture précédente ne vaut plus.
    setAmoChoisie(null);
    setError(null);
    getAmosDisponibles().then((result) => {
      if (result.success) setAmos(result.data);
      else setError(result.error || "Impossible de charger les AMO de votre territoire");
    });
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleConceal = () => onClose();
    dialog.addEventListener("dsfr.conceal", handleConceal);
    return () => dialog.removeEventListener("dsfr.conceal", handleConceal);
  }, [onClose]);

  const handleConfirm = async () => {
    if (choixRequis && !amoChoisie) {
      setError("Merci de choisir votre AMO");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await demanderMonAccompagnement(choixRequis ? (amoChoisie ?? undefined) : undefined);
      if (result.success) {
        // Rechargement complet (pas `router.refresh()`) : `statutAmo` vit dans le contexte
        // client `ParcoursProvider`, alimenté par un fetch séparé (`getValidationAmo`) que
        // `router.refresh()` ne redéclenche pas — le callout resterait affiché.
        window.location.reload();
      } else {
        setError(result.error || "Une erreur est survenue");
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error("Erreur demande accompagnement:", err);
      setError("Une erreur est survenue");
      setIsSubmitting(false);
    }
  };

  return (
    <dialog ref={dialogRef} id={MODAL_ID} className="fr-modal" aria-labelledby={`${MODAL_ID}-title`}>
      <div className="fr-container fr-container--fluid fr-container-md">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-10 fr-col-lg-8">
            <div className="fr-modal__body">
              <div className="fr-modal__header">
                <button aria-controls={MODAL_ID} title="Fermer" type="button" className="fr-btn--close fr-btn">
                  Fermer
                </button>
              </div>
              <div className="fr-modal__content">
                {error && (
                  <div className="fr-alert fr-alert--error fr-mb-2w">
                    <p>{error}</p>
                  </div>
                )}

                <h2 id={`${MODAL_ID}-title`} className="fr-modal__title">
                  <span className="fr-icon-arrow-right-line fr-mr-1w" aria-hidden="true" />
                  Demander à être accompagné
                </h2>

                <p>
                  Un Assistant à Maîtrise d&apos;Ouvrage (AMO) de votre territoire va être mis en relation avec vous
                  pour vous accompagner dans vos démarches.
                </p>
                {choixRequis && <ChoixAmoListe amos={amos} amoChoisie={amoChoisie} onChoix={setAmoChoisie} />}
                <p>Nous lui envoyons un e-mail pour l&apos;informer de votre demande.</p>
                <p className="fr-text--sm fr-text-mention--grey">
                  Si vous aviez déjà commencé à remplir votre formulaire d&apos;éligibilité sans accompagnement, il sera
                  réinitialisé pour intégrer votre AMO : vous recevrez un nouveau lien et devrez le remplir à nouveau.
                </p>
              </div>
              <div className="fr-modal__footer">
                <ul className="fr-btns-group fr-btns-group--right fr-btns-group--inline-reverse fr-btns-group--inline-lg">
                  <li>
                    <button type="button" className="fr-btn" disabled={isSubmitting} onClick={handleConfirm}>
                      {isSubmitting ? "Envoi en cours..." : "Demander à être accompagné"}
                    </button>
                  </li>
                  <li>
                    <button type="button" className="fr-btn fr-btn--secondary" aria-controls={MODAL_ID}>
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
