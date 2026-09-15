"use client";

import { useEffect, useRef, useState } from "react";
import { useDsfrModal } from "@/shared/hooks";
import { LIBELLE_FORMULAIRE } from "@/features/parcours/dossiers-ds/domain/value-objects/libelle-formulaire";
import { DELAI_MIN_REGENERATION_FORCE_SECONDES } from "@/features/parcours/dossiers-ds/domain/value-objects/regeneration-delais";
import type { Step } from "../../domain";
import { useParcours } from "../../context/useParcours";
import { recreerFormulaireAction } from "../../actions/recreation-formulaire.actions";

const MODAL_ID = "modal-recreer-formulaire-dn";

interface RecreerFormulaireModalProps {
  isOpen: boolean;
  onClose: () => void;
  step: Step;
}

/**
 * Confirme puis force la création d'un formulaire DN neuf (ADR-0027).
 *
 * La confirmation d'ici remplace la fenêtre anti-rafale de 10 min côté service : c'est elle
 * qui garantit que le demandeur sait ce qu'il perd. Un seul aller-retour serveur réinitialise
 * et recrée — sans quoi l'onglet DN ne pourrait plus être ouvert (Safari n'autorise
 * `window.open` que dans le geste utilisateur synchrone).
 */
export function RecreerFormulaireModal({ isOpen, onClose, step }: RecreerFormulaireModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { refresh, getDossierByStep } = useParcours();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rattache, setRattache] = useState<string | null>(null);
  const [nouveauLien, setNouveauLien] = useState<string | null>(null);

  useDsfrModal(dialogRef, isOpen);

  // Le serveur refuse un lien créé il y a moins de 30 s. Sans ce décompte, le refus arrivait
  // après coup : l'onglet ouvert pour DN se refermait aussitôt, sans que personne ne comprenne.
  const [maintenant, setMaintenant] = useState(() => Date.now());
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => setMaintenant(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [isOpen]);

  const creeLe = getDossierByStep(step)?.createdAt;
  const attenteRestante = creeLe
    ? Math.max(
        0,
        Math.ceil((new Date(creeLe).getTime() + DELAI_MIN_REGENERATION_FORCE_SECONDES * 1_000 - maintenant) / 1_000)
      )
    : 0;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleConceal = () => {
      setError(null);
      setRattache(null);
      setNouveauLien(null);
      onClose();
    };

    dialog.addEventListener("dsfr.conceal", handleConceal);
    return () => dialog.removeEventListener("dsfr.conceal", handleConceal);
  }, [onClose]);

  const handleConfirm = async () => {
    setError(null);
    setIsSubmitting(true);

    // Ouverture AVANT l'appel async : Safari n'autorise `window.open` qu'en contexte
    // synchrone d'un geste utilisateur.
    const dsWindow = window.open("about:blank", "_blank");
    if (dsWindow) {
      // Équivalent de `noopener` : un `window.open` pré-ouvert ne prend pas l'option, et la
      // page DN chargée ensuite ne doit pas garder la main sur notre onglet (tabnabbing).
      dsWindow.opener = null;
      dsWindow.document.title = "Chargement…";
      dsWindow.document.body.innerHTML =
        '<p style="font-family:system-ui,sans-serif;text-align:center;margin-top:40vh;font-size:1.2rem">' +
        "Création de votre nouveau formulaire en cours…</p>";
    }

    try {
      const result = await recreerFormulaireAction(step);

      if (!result.success) {
        dsWindow?.close();
        setError(result.error);
        return;
      }

      if (result.data.statut === "rattache") {
        dsWindow?.close();
        setRattache(result.data.dsNumber);
        return;
      }

      if (dsWindow && !dsWindow.closed) {
        dsWindow.location.href = result.data.dossierUrl;
      }
      // Le lien reste affiché : un bloqueur de fenêtres aurait avalé l'onglet.
      setNouveauLien(result.data.dossierUrl);
    } catch (err) {
      dsWindow?.close();
      console.error("Erreur recreerFormulaire:", err);
      setError("Une erreur inattendue s'est produite. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
      await refresh();
    }
  };

  const termine = Boolean(rattache || nouveauLien);

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
                <h2 id={`${MODAL_ID}-title`} className="fr-modal__title">
                  Créer un nouveau formulaire {LIBELLE_FORMULAIRE[step]}
                </h2>

                {rattache && (
                  <div className="fr-alert fr-alert--success fr-mb-2w">
                    <p>
                      Bonne nouvelle : votre dossier n&deg;&nbsp;{rattache} avait bien été transmis à Démarches
                      Numériques. Nous l&apos;avons retrouvé, il n&apos;y a rien à recréer.
                    </p>
                  </div>
                )}

                {nouveauLien && (
                  <div className="fr-alert fr-alert--success fr-mb-2w">
                    <p>
                      Votre nouveau formulaire est prêt et s&apos;ouvre dans un autre onglet. S&apos;il ne s&apos;est
                      pas ouvert,{" "}
                      <a href={nouveauLien} target="_blank" rel="noopener noreferrer">
                        cliquez ici pour y accéder
                      </a>
                      .
                    </p>
                  </div>
                )}

                {!termine && (
                  <>
                    <p>
                      Nous allons créer un formulaire neuf, prérempli avec les informations de votre compte, et
                      l&apos;ouvrir dans un nouvel onglet.
                    </p>
                    <p>
                      <strong>Ce que vous auriez déjà saisi dans l&apos;ancien formulaire ne sera pas repris.</strong>{" "}
                      Si vous aviez commencé à le remplir, mieux vaut le retrouver : connectez-vous à Démarches
                      Numériques avec l&apos;adresse e-mail que vous utilisez ici et regardez vos dossiers en cours.
                    </p>
                    <p className="fr-text--sm fr-text-mention--grey">
                      Votre ancien numéro de dossier reste conservé : si vous finissez par transmettre ce brouillon-là,
                      nous le rattacherons automatiquement à votre parcours.
                    </p>
                    {attenteRestante > 0 && (
                      <p className="fr-text--sm" role="status">
                        {`Votre lien vient d'être créé : essayez d'abord de l'ouvrir. Si vous voulez vraiment en créer un autre, ce sera possible dans ${attenteRestante} secondes.`}
                      </p>
                    )}
                  </>
                )}

                {error && (
                  <div className="fr-alert fr-alert--error fr-alert--sm fr-mt-2w">
                    <p>{error}</p>
                  </div>
                )}
              </div>

              <div className="fr-modal__footer">
                <ul className="fr-btns-group fr-btns-group--right fr-btns-group--inline-reverse fr-btns-group--inline-lg">
                  {!termine && (
                    <li>
                      <button
                        type="button"
                        className="fr-btn"
                        disabled={isSubmitting || attenteRestante > 0}
                        onClick={handleConfirm}>
                        {isSubmitting
                          ? "Création en cours…"
                          : attenteRestante > 0
                            ? `Disponible dans ${attenteRestante} s`
                            : "Créer un nouveau formulaire"}
                      </button>
                    </li>
                  )}
                  <li>
                    <button type="button" className="fr-btn fr-btn--secondary" aria-controls={MODAL_ID}>
                      {termine ? "Fermer" : "Annuler"}
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
