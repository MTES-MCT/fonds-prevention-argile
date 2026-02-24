"use client";

import { useState, useTransition, useEffect, useRef, useId } from "react";
import { useRouter } from "next/navigation";
import {
  QUALIFICATION_ACTIONS,
  QUALIFICATION_DECISIONS,
  RAISONS_INELIGIBILITE,
} from "@/features/backoffice/espace-agent/prospects/domain/types";
import type { QualificationDecision } from "@/features/backoffice/espace-agent/prospects/domain/types";
import { qualifyProspectAction } from "@/features/backoffice/espace-agent/prospects/actions/qualify-prospect.actions";

interface QualificationInitialValues {
  decision: QualificationDecision;
  actionsRealisees: string[];
  raisonsIneligibilite: string[] | null;
  note: string | null;
}

interface QualificationFormProps {
  parcoursId: string;
  onSuccess: () => void;
  onCancel?: () => void;
  /** Mode mise à jour : change le libellé du bouton et l'ordre des boutons */
  isUpdate?: boolean;
  /** Valeurs initiales pour préremplir le formulaire (mode mise à jour) */
  initialValues?: QualificationInitialValues;
}

/**
 * Parse un tableau de valeurs pouvant contenir "autre:précision".
 * Retourne les valeurs normalisées (avec "autre" sans suffix) et la précision extraite.
 */
function parseValuesWithAutre(values: string[]): { normalized: string[]; precision: string } {
  let precision = "";
  const normalized = values.map((v) => {
    if (v.startsWith("autre:")) {
      precision = v.slice("autre:".length);
      return "autre";
    }
    return v;
  });
  return { normalized, precision };
}

/** Textes de la modale de confirmation selon la décision */
const CONFIRM_CONFIG: Record<QualificationDecision, { title: string; description: string; button: string }> = {
  eligible: {
    title: "Confirmer l\u2019\u00e9ligibilit\u00e9 du demandeur ?",
    description:
      'Le dossier passera en statut \u201c<strong>\u00e9ligible</strong>\u201d. Vous pourrez toujours le mettre \u00e0 jour tant qu\u2019il n\u2019est pas transf\u00e9r\u00e9 \u00e0 l\u2019AMO ou supprim\u00e9 par le demandeur.',
    button: "Confirmer l\u2019\u00e9ligibilit\u00e9",
  },
  a_qualifier: {
    title: "Confirmer la mise en attente ?",
    description:
      'Le dossier passera en statut \u201c<strong>\u00e0 qualifier</strong>\u201d. Vous pourrez le requalifier \u00e0 tout moment.',
    button: "Confirmer",
  },
  non_eligible: {
    title: "Confirmer la non-\u00e9ligibilit\u00e9 du demandeur ?",
    description:
      'Le prospect sera <strong>archiv\u00e9</strong>. Vous pourrez le d\u00e9sarchiver \u00e0 tout moment depuis la liste des prospects archiv\u00e9s.',
    button: "Confirmer la non-\u00e9ligibilit\u00e9",
  },
};

/** Liste déroulante multi-select pour les raisons d'inéligibilité */
function RaisonsIneligibiliteSelect({
  raisonsIneligibilite,
  onRaisonChange,
  isAutreRaisonChecked,
  autreRaisonPrecision,
  onAutreRaisonPrecisionChange,
  disabled,
}: {
  raisonsIneligibilite: string[];
  onRaisonChange: (value: string, checked: boolean) => void;
  isAutreRaisonChecked: boolean;
  autreRaisonPrecision: string;
  onAutreRaisonPrecisionChange: (value: string) => void;
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fermer au clic en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const count = raisonsIneligibilite.length;
  const placeholder =
    count === 0
      ? "Sélectionnez une ou plusieurs raisons"
      : count === 1
        ? "1 raison sélectionnée"
        : `${count} raisons sélectionnées`;

  return (
    <div className="fr-mt-3w" ref={containerRef} style={{ position: "relative" }}>
      <label className="fr-label fr-text--bold fr-mb-1w">
        Merci de préciser les raisons de l&apos;inéligibilité du demandeur
      </label>
      <button
        type="button"
        className="fr-select"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        style={{
          textAlign: "left",
          cursor: "pointer",
          width: "100%",
        }}
      >
        {placeholder}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            zIndex: 10,
            left: 0,
            right: 0,
            backgroundColor: "var(--background-default-grey)",
            border: "1px solid var(--border-default-grey)",
            borderTop: "none",
            borderRadius: "0 0 4px 4px",
            maxHeight: "300px",
            overflowY: "auto",
            padding: "0.5rem 0",
          }}
        >
          {RAISONS_INELIGIBILITE.map((raison) => (
            <div key={raison.value} style={{ padding: "0.25rem 1rem" }}>
              <div className="fr-checkbox-group fr-checkbox-group--sm">
                <input
                  type="checkbox"
                  id={`raison-${raison.value}`}
                  value={raison.value}
                  checked={raisonsIneligibilite.includes(raison.value)}
                  onChange={(e) => onRaisonChange(raison.value, e.target.checked)}
                  disabled={disabled}
                />
                <label className="fr-label" htmlFor={`raison-${raison.value}`}>
                  {raison.label}
                </label>
              </div>
              {raison.value === "autre" && isAutreRaisonChecked && (
                <div className="fr-input-group fr-mt-1w fr-mb-1w">
                  <input
                    className="fr-input fr-input--sm"
                    type="text"
                    id="autre-raison-precision"
                    aria-label="Précisez la raison"
                    value={autreRaisonPrecision}
                    onChange={(e) => onAutreRaisonPrecisionChange(e.target.value)}
                    disabled={disabled}
                    placeholder="Précisez la raison"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Formulaire DSFR de qualification d'un prospect.
 * - Checkboxes : actions réalisées
 * - Radios : décision (eligible / a_qualifier / non_eligible)
 * - Checkboxes conditionnelles : raisons d'inéligibilité (si non_eligible)
 * - Textarea : note complémentaire
 * - Modale de confirmation avant soumission
 */
export function QualificationForm({ parcoursId, onSuccess, onCancel, isUpdate, initialValues }: QualificationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Parse des valeurs initiales (gère le format "autre:précision")
  const initActions = initialValues ? parseValuesWithAutre(initialValues.actionsRealisees) : null;
  const initRaisons = initialValues?.raisonsIneligibilite
    ? parseValuesWithAutre(initialValues.raisonsIneligibilite)
    : null;

  // State formulaire
  const [actionsRealisees, setActionsRealisees] = useState<string[]>(initActions?.normalized ?? []);
  const [autreActionPrecision, setAutreActionPrecision] = useState(initActions?.precision ?? "");
  const [decision, setDecision] = useState<QualificationDecision | "">(initialValues?.decision ?? "");
  const [raisonsIneligibilite, setRaisonsIneligibilite] = useState<string[]>(initRaisons?.normalized ?? []);
  const [autreRaisonPrecision, setAutreRaisonPrecision] = useState(initRaisons?.precision ?? "");
  const [note, setNote] = useState(initialValues?.note ?? "");
  const [error, setError] = useState<string | null>(null);

  // State modale
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const uniqueId = useId();
  const modalId = `modal-confirm-qualification-${uniqueId}`;

  const isAutreActionChecked = actionsRealisees.includes("autre");
  const isAutreRaisonChecked = raisonsIneligibilite.includes("autre");

  // Ouvrir/fermer la modale via l'API DSFR
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modalInstance = (window as any).dsfr?.(dialog)?.modal;
    if (!modalInstance) return;

    if (isModalOpen) {
      modalInstance.disclose();
    } else {
      modalInstance.conceal();
    }
  }, [isModalOpen]);

  // Ecouter la fermeture externe (Escape, clic en dehors)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleConceal = () => {
      setIsModalOpen(false);
    };

    dialog.addEventListener("dsfr.conceal", handleConceal);
    return () => {
      dialog.removeEventListener("dsfr.conceal", handleConceal);
    };
  }, []);

  // Handlers
  function handleActionChange(value: string, checked: boolean) {
    setActionsRealisees((prev) => (checked ? [...prev, value] : prev.filter((v) => v !== value)));
    if (value === "autre" && !checked) {
      setAutreActionPrecision("");
    }
  }

  function handleRaisonChange(value: string, checked: boolean) {
    setRaisonsIneligibilite((prev) => (checked ? [...prev, value] : prev.filter((v) => v !== value)));
    if (value === "autre" && !checked) {
      setAutreRaisonPrecision("");
    }
  }

  function handleDecisionChange(value: string) {
    setDecision(value as QualificationDecision);
    if (value !== "non_eligible") {
      setRaisonsIneligibilite([]);
    }
  }

  /** Validation du formulaire → ouvre la modale de confirmation */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (actionsRealisees.length === 0) {
      setError("Veuillez sélectionner au moins une action réalisée.");
      return;
    }
    if (!decision) {
      setError("Veuillez sélectionner une décision.");
      return;
    }
    if (decision === "non_eligible" && raisonsIneligibilite.length === 0) {
      setError("Veuillez sélectionner au moins une raison d'inéligibilité.");
      return;
    }

    // Validation OK → ouvrir la modale
    setIsModalOpen(true);
  }

  /** Confirmation dans la modale → appel serveur */
  function handleConfirm() {
    if (!decision) return;

    startTransition(async () => {
      const finalActions = actionsRealisees.map((a) =>
        a === "autre" && autreActionPrecision.trim() ? `autre:${autreActionPrecision.trim()}` : a
      );
      const finalRaisons = raisonsIneligibilite.map((r) =>
        r === "autre" && autreRaisonPrecision.trim() ? `autre:${autreRaisonPrecision.trim()}` : r
      );

      const result = await qualifyProspectAction({
        parcoursId,
        decision,
        actionsRealisees: finalActions,
        raisonsIneligibilite: decision === "non_eligible" ? finalRaisons : undefined,
        note: note.trim() || undefined,
      });

      // Fermer la modale
      setIsModalOpen(false);

      if (!result.success) {
        setError(result.error);
        return;
      }

      onSuccess();
      router.refresh();
    });
  }

  const confirmConfig = decision ? CONFIRM_CONFIG[decision] : null;

  return (
    <>
      <form onSubmit={handleSubmit}>
        {/* Erreur globale */}
        {error && (
          <div className="fr-alert fr-alert--error fr-alert--sm fr-mb-3w">
            <p>{error}</p>
          </div>
        )}

        {/* 1. Actions réalisées avec le demandeur */}
        <fieldset className="fr-fieldset" aria-labelledby="actions-legend actions-hint">
          <legend className="fr-fieldset__legend fr-text--bold" id="actions-legend">
            1. Actions réalisées avec le demandeur
          </legend>
          <p className="fr-hint-text fr-mb-2w" id="actions-hint">
            Sélectionnez les actions menées
          </p>
          {QUALIFICATION_ACTIONS.map((action) => (
            <div key={action.value} className="fr-fieldset__element">
              <div className="fr-checkbox-group">
                <input
                  type="checkbox"
                  id={`action-${action.value}`}
                  name="actionsRealisees"
                  value={action.value}
                  checked={actionsRealisees.includes(action.value)}
                  onChange={(e) => handleActionChange(action.value, e.target.checked)}
                  disabled={isPending}
                />
                <label className="fr-label" htmlFor={`action-${action.value}`}>
                  {action.label}
                </label>
              </div>
              {action.value === "autre" && isAutreActionChecked && (
                <div className="fr-input-group fr-mt-1w">
                  <input
                    className="fr-input"
                    type="text"
                    id="autre-action-precision"
                    aria-label="Précisez l'action réalisée"
                    value={autreActionPrecision}
                    onChange={(e) => setAutreActionPrecision(e.target.value)}
                    disabled={isPending}
                    placeholder="Précisez l'action réalisée"
                  />
                </div>
              )}
            </div>
          ))}
        </fieldset>

        {/* 2. Le demandeur est-il éligible au dispositif ? */}
        <fieldset className="fr-fieldset fr-mt-3w" aria-labelledby="decision-legend">
          <legend className="fr-fieldset__legend fr-text--bold" id="decision-legend">
            2. Le demandeur est-il éligible au dispositif ?
          </legend>
          {QUALIFICATION_DECISIONS.map((d) => (
            <div key={d.value} className="fr-fieldset__element">
              <div className="fr-radio-group">
                <input
                  type="radio"
                  id={`decision-${d.value}`}
                  name="decision"
                  value={d.value}
                  checked={decision === d.value}
                  onChange={() => handleDecisionChange(d.value)}
                  disabled={isPending}
                />
                <label className="fr-label" htmlFor={`decision-${d.value}`}>
                  {d.label}
                </label>
              </div>
            </div>
          ))}
        </fieldset>

        {/* Raisons d'inéligibilité — liste déroulante multi-select (conditionnel) */}
        {decision === "non_eligible" && (
          <RaisonsIneligibiliteSelect
            raisonsIneligibilite={raisonsIneligibilite}
            onRaisonChange={handleRaisonChange}
            isAutreRaisonChecked={isAutreRaisonChecked}
            autreRaisonPrecision={autreRaisonPrecision}
            onAutreRaisonPrecisionChange={setAutreRaisonPrecision}
            disabled={isPending}
          />
        )}

        {/* Note complémentaire */}
        <div className="fr-input-group fr-mt-3w">
          <label className="fr-label" htmlFor="qualification-note">
            3. Note complémentaire
            <span className="fr-hint-text">Optionnel</span>
          </label>
          <textarea
            className="fr-input"
            id="qualification-note"
            name="note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isPending}
            placeholder="Ajoutez des informations complémentaires si nécessaires"
          />
        </div>

        {/* Boutons */}
        <div className="fr-btns-group fr-btns-group--inline fr-mt-3w">
          {isUpdate && onCancel && (
            <button type="button" className="fr-btn fr-btn--secondary" onClick={onCancel} disabled={isPending}>
              Annuler
            </button>
          )}
          <button type="submit" className="fr-btn" disabled={isPending}>
            <span className="fr-icon-save-line fr-icon--sm fr-mr-1w" aria-hidden="true" />
            {isPending ? "Enregistrement..." : isUpdate ? "Enregistrer la mise à jour" : "Enregistrer"}
          </button>
          {!isUpdate && onCancel && (
            <button type="button" className="fr-btn fr-btn--secondary" onClick={onCancel} disabled={isPending}>
              Annuler
            </button>
          )}
        </div>
      </form>

      {/* Modale de confirmation */}
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
                  {confirmConfig && (
                    <>
                      <h1 id={`${modalId}-title`} className="fr-modal__title">
                        <span className="fr-icon-arrow-right-line fr-icon--lg fr-mr-1w" aria-hidden="true" />
                        {confirmConfig.title}
                      </h1>
                      <p dangerouslySetInnerHTML={{ __html: confirmConfig.description }} />
                    </>
                  )}
                </div>
                <div className="fr-modal__footer">
                  <ul className="fr-btns-group fr-btns-group--right fr-btns-group--inline-reverse fr-btns-group--inline-lg">
                    <li>
                      <button
                        type="button"
                        className="fr-btn"
                        disabled={isPending}
                        onClick={handleConfirm}
                      >
                        {isPending ? "Enregistrement..." : confirmConfig?.button ?? "Confirmer"}
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
    </>
  );
}
