"use client";

import { useEffect, useRef, useState, useId } from "react";
import { archiveDossierAction } from "@/features/backoffice/espace-agent/dossiers/actions";
import {
  RAISONS_ARCHIVAGE,
  type GroupeRaisons,
} from "@/features/backoffice/espace-agent/shared/domain/value-objects/raisons-fin-suivi";
import type { ActionResult } from "@/shared/types";

const GROUPES_PAR_DEFAUT: readonly GroupeRaisons[] = [{ label: "", raisons: RAISONS_ARCHIVAGE }];

interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcoursId: string;
  onSuccess: () => void;
  /** Action serveur d'archivage (défaut : archiveDossierAction) */
  archiveAction?: (parcoursId: string, reason: string) => Promise<ActionResult<void>>;
  /** Label de l'entité ("dossier" ou "prospect") — défaut : "dossier" */
  entityLabel?: string;
  /** Description personnalisée (override le texte par défaut) */
  description?: string;
  /** Raisons groupées : un `optgroup` par groupe dès qu'il y en a plusieurs. */
  groupesRaisons?: readonly GroupeRaisons[];
  /** Titre, label et bouton deviennent neutres quand une raison n'archive pas. */
  titre?: string;
  labelSelect?: string;
  libelleAction?: string;
  /** Conséquence de la raison sélectionnée, affichée avant de confirmer. */
  alerteParRaison?: (raison: string) => string | null;
}

/**
 * Modale de fin de suivi (dossiers AMO et prospects) : choisir une raison, puis confirmer.
 * La raison peut décider de la suite — toutes n'archivent pas (cf. `raisons-fin-suivi`).
 */
export function ArchiveModal({
  isOpen,
  onClose,
  parcoursId,
  onSuccess,
  archiveAction = archiveDossierAction,
  entityLabel = "dossier",
  description,
  groupesRaisons = GROUPES_PAR_DEFAUT,
  titre,
  labelSelect,
  libelleAction,
  alerteParRaison,
}: ArchiveModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uniqueId = useId();
  const modalId = `modal-archive-${uniqueId}`;
  const selectId = `archive-reason-${uniqueId}`;

  const defaultDescription =
    entityLabel === "prospect"
      ? 'Le prospect passera en statut "Archivé". Vous pourrez le désarchiver à tout moment depuis la liste des prospects archivés.'
      : "Le dossier passera en statut \"Archivé\". Vous pourrez toujours le mettre à jour tant qu'il n'est pas transféré à l'AMO ou supprimé par le demandeur.";

  const displayDescription = description ?? defaultDescription;
  const displayTitre = titre ?? `Archiver le ${entityLabel} ?`;
  const displayLabelSelect = labelSelect ?? `Pour quelles raisons souhaitez-vous archiver le ${entityLabel} ?`;
  const displayLibelleAction = libelleAction ?? "Archiver";
  const alerte = reason ? (alerteParRaison?.(reason) ?? null) : null;

  // Ouvrir/fermer via l'API DSFR
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modalInstance = (window as any).dsfr?.(dialog)?.modal;
    if (!modalInstance) return;

    if (isOpen) {
      modalInstance.disclose();
    } else {
      modalInstance.conceal();
    }
  }, [isOpen]);

  // Ecouter la fermeture externe (Escape, clic en dehors)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleConceal = () => {
      setReason("");
      setError(null);
      onClose();
    };

    dialog.addEventListener("dsfr.conceal", handleConceal);
    return () => {
      dialog.removeEventListener("dsfr.conceal", handleConceal);
    };
  }, [onClose]);

  async function handleSubmit() {
    if (!reason) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await archiveAction(parcoursId, reason);

      if (result.success) {
        setReason("");
        // Fermer la modale via DSFR
        const dialog = dialogRef.current;
        if (dialog) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const modalInstance = (window as any).dsfr?.(dialog)?.modal;
          if (modalInstance) modalInstance.conceal();
        }
        onSuccess();
      } else {
        setError(result.error || "Erreur lors de l'archivage");
      }
    } catch {
      setError("Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  }

  const groupes = groupesRaisons.length > 0 ? groupesRaisons : GROUPES_PAR_DEFAUT;
  const rendreOptions = groupes.length > 1 || groupes.some((g) => g.label !== "");

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
                  {displayTitre}
                </h1>
                <p>{displayDescription}</p>

                {error && (
                  <div className="fr-alert fr-alert--error fr-alert--sm fr-mb-2w">
                    <p>{error}</p>
                  </div>
                )}

                <div className="fr-select-group">
                  <label className="fr-label" htmlFor={selectId}>
                    {displayLabelSelect}
                  </label>
                  <select
                    className="fr-select"
                    id={selectId}
                    name="archive-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}>
                    <option value="" disabled>
                      S&eacute;lectionnez une raison
                    </option>
                    {rendreOptions
                      ? groupes.map((groupe) => (
                          <optgroup key={groupe.label} label={groupe.label}>
                            {groupe.raisons.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </optgroup>
                        ))
                      : groupes[0].raisons.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                  </select>
                </div>

                {alerte && (
                  <div className="fr-alert fr-alert--info fr-alert--sm fr-mt-2w">
                    <p>{alerte}</p>
                  </div>
                )}
              </div>
              <div className="fr-modal__footer">
                <ul className="fr-btns-group fr-btns-group--right fr-btns-group--inline-reverse fr-btns-group--inline-lg">
                  <li>
                    <button type="button" className="fr-btn" disabled={!reason || isSubmitting} onClick={handleSubmit}>
                      {isSubmitting ? "Enregistrement..." : displayLibelleAction}
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
