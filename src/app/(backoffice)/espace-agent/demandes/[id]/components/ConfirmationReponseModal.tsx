"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { StatutValidationAmo } from "@/features/parcours/amo/domain/value-objects";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";

interface ConfirmationReponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  choix: StatutValidationAmo;
  demandeId: string;
  nextDemandeId: string | null;
}

/**
 * Modale de confirmation après réponse à une demande d'accompagnement
 *
 * Affiche un message différent selon le choix effectué :
 * - LOGEMENT_ELIGIBLE : Demande ajoutée aux dossiers suivis
 * - LOGEMENT_NON_ELIGIBLE : Demande archivée (inéligibilité)
 * - ACCOMPAGNEMENT_REFUSE : Demande archivée (refus)
 */
export function ConfirmationReponseModal({
  isOpen,
  onClose,
  choix,
  demandeId,
  nextDemandeId,
}: ConfirmationReponseModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  // Gérer l'ouverture/fermeture via le DSFR
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Utiliser l'API DSFR pour ouvrir/fermer la modale
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modalInstance = (window as any).dsfr?.(dialog)?.modal;

    if (!modalInstance) {
      console.warn("DSFR modal instance not found");
      return;
    }

    if (isOpen) {
      modalInstance.disclose();
    } else {
      modalInstance.conceal();
    }
  }, [isOpen]);

  // Écouter la fermeture de la modale par le DSFR (clic en dehors, Escape, etc.)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleConceal = () => {
      onClose();
    };

    dialog.addEventListener("dsfr.conceal", handleConceal);
    return () => {
      dialog.removeEventListener("dsfr.conceal", handleConceal);
    };
  }, [onClose]);

  const handleNavigate = (href: string) => {
    // Fermer la modale avant de naviguer
    const dialog = dialogRef.current;
    if (dialog) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modalInstance = (window as any).dsfr?.(dialog)?.modal;
      if (modalInstance) {
        modalInstance.conceal();
      }
    }
    router.push(href);
  };

  const getModalContent = () => {
    switch (choix) {
      case StatutValidationAmo.LOGEMENT_ELIGIBLE:
        return {
          icon: "fr-icon-check-line",
          title: "Demande ajoutée aux dossiers suivis",
          description: "Merci de votre réponse ! Nous allons informer le demandeur par email.",
          nextStep: {
            label: "Prochaine étape :",
            text: "Contactez-le pour l'aider à remplir son dossier d'éligibilité sur Démarche Numérique.",
          },
          secondaryButton: {
            label: "Voir le dossier",
            href: ROUTES.backoffice.espaceAmo.dossier(demandeId),
            icon: "fr-icon-eye-line",
          },
        };

      case StatutValidationAmo.LOGEMENT_NON_ELIGIBLE:
        return {
          icon: "fr-icon-archive-line",
          title: "Demande archivée",
          description: "Merci de votre réponse ! Nous allons informer le demandeur par email.",
          hint: "N'hésitez pas à prendre le temps de l'appeler pour lui expliquer les raisons de l'inéligibilité.",
          secondaryButton: {
            label: "Retour à l'accueil",
            href: ROUTES.backoffice.espaceAmo.root,
            icon: "fr-icon-arrow-left-line",
            isSecondary: true,
          },
        };

      case StatutValidationAmo.ACCOMPAGNEMENT_REFUSE:
        return {
          icon: "fr-icon-archive-line",
          title: "Demande archivée",
          description: "Merci de votre réponse ! Nous allons informer le demandeur par email.",
          hint: "N'hésitez pas à prendre le temps de l'appeler pour lui expliquer les raisons de votre choix.",
          secondaryButton: {
            label: "Retour à l'accueil",
            href: ROUTES.backoffice.espaceAmo.root,
            icon: "fr-icon-arrow-left-line",
            isSecondary: true,
          },
        };

      default:
        return null;
    }
  };

  const content = getModalContent();
  if (!content) return null;

  return (
    <dialog
      ref={dialogRef}
      id="modal-confirmation-reponse"
      className="fr-modal"
      aria-labelledby="modal-confirmation-title">
      <div className="fr-container fr-container--fluid fr-container-md">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-10 fr-col-lg-8">
            <div className="fr-modal__body">
              <div className="fr-modal__header">
                <button
                  aria-controls="modal-confirmation-reponse"
                  title="Fermer"
                  type="button"
                  className="fr-btn--close fr-btn">
                  Fermer
                </button>
              </div>
              <div className="fr-modal__content">
                <h1 id="modal-confirmation-title" className="fr-modal__title">
                  <span className={`${content.icon} fr-icon--lg fr-mr-2v`} aria-hidden="true"></span>
                  {content.title}
                </h1>
                <p>{content.description}</p>

                {content.nextStep && (
                  <div className="fr-mt-2w">
                    <p className="fr-text--bold fr-mb-1v">{content.nextStep.label}</p>
                    <p className="fr-mb-0">{content.nextStep.text}</p>
                  </div>
                )}

                {content.hint && <p className="fr-mt-2w fr-mb-0">{content.hint}</p>}
              </div>
              <div className="fr-modal__footer">
                <ul className="fr-btns-group fr-btns-group--right fr-btns-group--inline-reverse fr-btns-group--inline-lg fr-btns-group--icon-left">
                  {nextDemandeId && (
                    <li>
                      <button
                        type="button"
                        onClick={() => handleNavigate(ROUTES.backoffice.espaceAmo.demande(nextDemandeId))}
                        className="fr-btn fr-icon-arrow-right-line fr-btn--icon-right">
                        Demandeur suivant
                      </button>
                    </li>
                  )}
                  <li>
                    <button
                      type="button"
                      onClick={() => handleNavigate(content.secondaryButton.href)}
                      className={`fr-btn ${content.secondaryButton.icon} fr-btn--secondary fr-btn--icon-left`}>
                      {content.secondaryButton.label}
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
