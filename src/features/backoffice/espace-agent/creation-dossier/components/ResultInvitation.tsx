"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EligibilityChecks } from "@/features/simulateur/domain/entities/eligibility-result.entity";
import { EligibilityChecksList } from "@/features/simulateur/components/results/EligibilityChecksList";
import { useSimulateurStore, selectAnswers } from "@/features/simulateur/stores/simulateur.store";
import { EligibilityService } from "@/features/simulateur/domain/services/eligibility.service";
import { SimulateurStep } from "@/features/simulateur/domain/value-objects/simulateur-step.enum";
import { updateSimulationDataAction } from "@/features/backoffice/espace-agent/shared/actions/update-simulation-data.action";
import { sendInvitationEmailAction } from "../actions/send-invitation-email.action";

interface ResultInvitationProps {
  parcoursId: string;
  demandeurEmail: string;
  checks: EligibilityChecks;
  isEligible: boolean;
  /** Callback pour retourner à l'étape précédente du simulateur (avant le résultat). */
  onBack: () => void;
  /** Callback pour réinitialiser la simulation et redémarrer à la 1ère étape. */
  onRestart: () => void;
}

/**
 * Écran de résultat de l'étape 4/4 du wizard invitation.
 * Affiche :
 *  - Cas éligible : callout vert + bullets (email auto + dossier suivi) +
 *    bouton "Envoyer et enregistrer le dossier" + "Recommencer la simulation".
 *  - Cas non éligible : callout rouge + bullets (dossier suivi + conseil) +
 *    bouton "Enregistrer le dossier et quitter" + "Recommencer la simulation".
 *
 * Au click sur le bouton principal :
 *  - Sauvegarde des données simulation via updateSimulationDataAction
 *  - Si éligible : envoi de l'email d'invitation au demandeur
 *  - Redirection vers la page prospect du dossier créé
 */
export function ResultInvitation({
  parcoursId,
  demandeurEmail,
  checks,
  isEligible,
  onBack,
  onRestart,
}: ResultInvitationProps) {
  const router = useRouter();
  const answers = useSimulateurStore(selectAnswers);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const titleText = isEligible
    ? "Faire une simulation d’éligibilité puis créer le dossier"
    : "Faire une simulation d’éligibilité et créer le dossier";
  const primaryLabel = isEligible ? "Envoyer et enregistrer le dossier" : "Enregistrer le dossier et quitter";

  const handleSaveAndExit = () => {
    setError(null);
    startTransition(async () => {
      const fullRgaData = EligibilityService.toRGASimulationData(answers);
      if (!fullRgaData) {
        setError("Données de simulation incomplètes");
        return;
      }
      const saved = await updateSimulationDataAction(parcoursId, fullRgaData);
      if (!saved.success) {
        setError(saved.error || "Erreur lors de la sauvegarde");
        return;
      }

      // Cas éligible : envoi du mail d'invitation (auto, pas de choix).
      // Cas non éligible : pas d'envoi, juste sauvegarde + redirect.
      if (isEligible) {
        await sendInvitationEmailAction(parcoursId, true);
      }

      router.push(`/espace-agent/prospects/${parcoursId}`);
    });
  };

  const handleRestart = () => {
    onRestart();
    // onRestart appelle store.reset() puis store.setEditMode(false). On remet
    // le simulateur dans l'état initial (TYPE_LOGEMENT, history vide, editMode=true)
    // pour relancer immédiatement la simulation.
    useSimulateurStore.getState().setEditMode(true);
    useSimulateurStore.setState((state) => ({
      simulation: {
        ...state.simulation,
        currentStep: SimulateurStep.TYPE_LOGEMENT,
        history: [],
        answers: {},
        result: null,
      },
    }));
  };

  return (
    <>
      {isEligible ? (
        <div className="fr-callout fr-icon-checkbox-fill fr-callout--green-emeraude">
          <h3 className="fr-callout__title">Le demandeur est éligible au Fonds Argile</h3>
          <p className="fr-callout__text">Il va pouvoir continuer ses démarches via son compte.</p>
        </div>
      ) : (
        <div className="fr-callout fr-icon-warning-line fr-callout--pink-macaron">
          <h3 className="fr-callout__title">Le demandeur n&apos;est pas éligible au Fonds Argile</h3>
          <p className="fr-callout__text">Il ne va pas pouvoir continuer ses démarches.</p>
        </div>
      )}

      <ul className="fr-mt-4w">
        {isEligible && (
          <li>
            Un email automatique va être envoyé sur <strong>{demandeurEmail || "l'adresse email du demandeur"}</strong>{" "}
            afin que le demandeur accède à sa simulation
          </li>
        )}
        <li>Ce dossier sera ajouté à vos dossiers suivis</li>
        {!isEligible && (
          <li>
            Nous vous conseillons d&apos;informer le demandeur de son inéligibilité. Les détails sont disponibles
            ci-dessous.
          </li>
        )}
      </ul>

      <div className="flex justify-end fr-mt-2w">
        <button type="button" className="fr-btn" onClick={handleSaveAndExit} disabled={isPending} title={titleText}>
          {isPending ? "Enregistrement..." : primaryLabel}
        </button>
      </div>

      {error && (
        <div className="fr-alert fr-alert--error fr-alert--sm fr-mt-2w">
          <p>{error}</p>
        </div>
      )}

      <div className="fr-mt-4w fr-mb-2w" />

      <EligibilityChecksList checks={checks} isEligible={isEligible} defaultCollapsed />

      <div className="fr-mt-4w flex flex-col-reverse md:flex-row md:justify-end gap-2">
        <button
          type="button"
          className="fr-btn fr-btn--secondary !w-full md:!w-auto justify-center"
          onClick={onBack}
          disabled={isPending}>
          Précédent
        </button>
        <button
          type="button"
          className="fr-btn fr-btn--secondary fr-icon-refresh-line fr-btn--icon-left !w-full md:!w-auto justify-center"
          onClick={handleRestart}
          disabled={isPending}>
          Recommencer la simulation
        </button>
      </div>
    </>
  );
}
