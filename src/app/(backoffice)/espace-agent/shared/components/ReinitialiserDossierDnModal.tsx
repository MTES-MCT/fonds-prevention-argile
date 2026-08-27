"use client";

import { useEffect, useRef, useState, useId } from "react";
import { reinitialiserDossierDnAction } from "@/features/backoffice/espace-agent/dossiers/actions/reinitialiser-dossier-dn.actions";
import { Step, STEP_LABELS } from "@/shared/domain/value-objects/step.enum";

/** Nomme le formulaire visé : « le formulaire d'éligibilité » se lit, « le formulaire éligibilité » non. */
export const LIBELLE_FORMULAIRE: Partial<Record<Step, string>> = {
  [Step.ELIGIBILITE]: "d'éligibilité",
  [Step.DIAGNOSTIC]: "de diagnostic",
  [Step.DEVIS]: "de devis",
};

interface ReinitialiserDossierDnModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcoursId: string;
  step: Step;
  onSuccess: () => void;
}

/**
 * Rend au demandeur un lien de formulaire neuf (ADR-0026, ADR-0027).
 * Deux situations y mènent et sont indiscernables côté API : l'abandon en cours de route,
 * et le brouillon commencé sous un autre compte Démarches Numériques.
 */
export function ReinitialiserDossierDnModal({
  isOpen,
  onClose,
  parcoursId,
  step,
  onSuccess,
}: ReinitialiserDossierDnModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rattache, setRattache] = useState<string | null>(null);
  const uniqueId = useId();
  const modalId = `modal-reinit-dn-${uniqueId}`;

  // Ouverture/fermeture via l'API DSFR : l'attribut HTML `open` ne suffit pas.
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

    const handleConceal = () => {
      setError(null);
      setRattache(null);
      onClose();
    };

    dialog.addEventListener("dsfr.conceal", handleConceal);
    return () => dialog.removeEventListener("dsfr.conceal", handleConceal);
  }, [onClose]);

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await reinitialiserDossierDnAction(parcoursId, step);

      if (!result.success) {
        setError(result.error || "Erreur lors de la réinitialisation");
        return;
      }

      // Un ancien numéro avait été déposé entre-temps : on a rattaché au lieu de recréer.
      if (result.data.statut === "rattache") {
        setRattache(result.data.dsNumber ?? null);
        onSuccess();
        return;
      }

      const dialog = dialogRef.current;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modalInstance = dialog ? (window as any).dsfr?.(dialog)?.modal : null;
      if (modalInstance) modalInstance.conceal();
      onSuccess();
    } catch {
      setError("Une erreur est survenue");
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
                <h1 id={`${modalId}-title`} className="fr-modal__title">
                  R&eacute;initialiser le formulaire {LIBELLE_FORMULAIRE[step]}
                </h1>

                {rattache ? (
                  <div className="fr-alert fr-alert--success fr-alert--sm">
                    <p>
                      Bonne nouvelle : le dossier n&deg;&nbsp;{rattache} avait bien &eacute;t&eacute; transmis. Il vient
                      d&apos;&ecirc;tre rattach&eacute; au parcours, rien n&apos;a &eacute;t&eacute;
                      r&eacute;initialis&eacute;.
                    </p>
                  </div>
                ) : (
                  <>
                    <p>
                      Seul le formulaire <strong>{STEP_LABELS[step].toLowerCase()}</strong>, celui de
                      l&apos;&eacute;tape en cours, est concern&eacute; : les &eacute;tapes pr&eacute;c&eacute;dentes ne
                      sont pas touch&eacute;es.
                    </p>
                    <p>
                      Le demandeur a ouvert ce formulaire mais ne l&apos;a jamais transmis. Deux explications possibles,
                      que nous ne pouvons pas distinguer :
                    </p>
                    <ul>
                      <li>
                        il a renonc&eacute; en cours de route, souvent faute d&apos;arriver &agrave; se connecter ;
                      </li>
                      <li>
                        il a commenc&eacute; son brouillon avec un compte D&eacute;marches Num&eacute;riques, et revient
                        aujourd&apos;hui avec un autre (FranceConnect, ou une autre adresse) : son brouillon existe,
                        mais il ne le retrouve pas.
                      </li>
                    </ul>
                    <p className="fr-text--sm">
                      Dans les deux cas, la r&eacute;initialisation lui rend un lien neuf : &agrave; sa prochaine
                      visite, il repart d&apos;un formulaire vierge et pr&eacute;rempli.{" "}
                      <strong>Aucune donn&eacute;e n&apos;est perdue</strong> : l&apos;ancien num&eacute;ro reste
                      conserv&eacute;, et s&apos;il finit par d&eacute;poser ce brouillon, nous le rattacherons
                      automatiquement.
                    </p>
                    <p className="fr-text--sm">
                      Avant de r&eacute;initialiser, demandez-lui s&apos;il a d&eacute;j&agrave; commenc&eacute; un
                      dossier sous une autre adresse : s&apos;il le retrouve, il vaut mieux qu&apos;il le termine.
                    </p>
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
                  {!rattache && (
                    <li>
                      <button type="button" className="fr-btn" disabled={isSubmitting} onClick={handleSubmit}>
                        {isSubmitting ? "Vérification..." : "Réinitialiser le formulaire"}
                      </button>
                    </li>
                  )}
                  <li>
                    <button type="button" className="fr-btn fr-btn--secondary" aria-controls={modalId}>
                      {rattache ? "Fermer" : "Annuler"}
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
