"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { EligibilityChecks } from "../../domain/entities/eligibility-result.entity";
import { EligibilityChecksList } from "./EligibilityChecksList";
import { ModificationsSummary } from "./ModificationsSummary";
import { ConfirmationSaveModal } from "./ConfirmationSaveModal";
import { useSimulateurContext } from "../shared/SimulateurContext";
import { useSimulateurStore, selectAnswers } from "../../stores/simulateur.store";
import { evaluateAllChecks } from "../../domain/rules/navigation";
import { computeModifications } from "../../domain/services/modifications-comparison.service";
import { EligibilityService } from "../../domain/services/eligibility.service";
import { updateSimulationDataAction } from "@/features/backoffice/espace-agent/shared/actions/update-simulation-data.action";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { ProgressBar } from "../shared/ProgressBar";
import { TOTAL_ETAPES } from "../../domain/value-objects/simulateur-step.enum";

interface ResultEditionProps {
  checks: EligibilityChecks;
  isEligible: boolean;
  onBack: () => void;
  onRestart: () => void;
}

/**
 * Page de résultat spécifique au mode édition agent.
 * Affiche le résultat d'éligibilité, le résumé des modifications,
 * et un bouton pour enregistrer les changements.
 */
export function ResultEdition({ checks, isEligible, onBack, onRestart }: ResultEditionProps) {
  const router = useRouter();
  const { formTitle, initialData, dossierId } = useSimulateurContext();
  const answers = useSimulateurStore(selectAnswers);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Calculer les checks initiaux (sans early-exit) et les modifications
  const { modifications } = useMemo(() => {
    if (!initialData) {
      return { modifications: [] };
    }

    const initialChecks = evaluateAllChecks(initialData);
    const mods = computeModifications(initialData, answers, initialChecks, checks);
    return { modifications: mods };
  }, [initialData, answers, checks]);

  // Ouvrir la modale de confirmation
  const handleSave = () => {
    setIsModalOpen(true);
  };

  // Enregistrer après confirmation
  const handleConfirmSave = async () => {
    if (!dossierId) return;

    setIsSaving(true);
    setError(null);

    try {
      // Merger les réponses courantes avec les données initiales en fallback
      // pour les champs non re-saisis par l'agent (ex: zone_dexposition si la BDNB ne la fournit pas)
      // On filtre les valeurs undefined des answers pour ne pas écraser les valeurs initiales
      const stripUndefined = <T extends Record<string, unknown>>(obj: T | undefined): Partial<T> => {
        if (!obj) return {};
        return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
      };

      const mergedAnswers = initialData
        ? {
            logement: { ...initialData.logement, ...stripUndefined(answers.logement) },
            taxeFonciere: { ...initialData.taxeFonciere, ...stripUndefined(answers.taxeFonciere) },
            rga: { ...initialData.rga, ...stripUndefined(answers.rga) },
            menage: { ...initialData.menage, ...stripUndefined(answers.menage) },
            vous: { ...initialData.vous, ...stripUndefined(answers.vous) },
          }
        : answers;

      const fullRgaData = EligibilityService.toRGASimulationData(mergedAnswers);

      if (!fullRgaData) {
        setError("Données de simulation incomplètes");
        setIsSaving(false);
        setIsModalOpen(false);
        return;
      }

      const result = await updateSimulationDataAction(dossierId, fullRgaData);

      if (!result.success) {
        setError(result.error || "Erreur lors de la sauvegarde");
        setIsSaving(false);
        setIsModalOpen(false);
        return;
      }

      // Rediriger vers la page du dossier
      router.push(ROUTES.backoffice.espaceAmo.dossier(dossierId));
    } catch {
      setError("Erreur lors de la sauvegarde");
      setIsSaving(false);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="bg-[var(--background-alt-grey)] min-h-screen md:min-h-0 md:bg-transparent">
      <div className="fr-container fr-mb-8w">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-8 md:bg-[var(--background-alt-grey)] p-0 md:p-10">
            {/* Lien "Recommencer la simulation" en haut à droite */}
            <div className="flex justify-end fr-mb-2w px-4 pt-4 md:px-0 md:pt-0">
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); onRestart(); }}
                className="fr-link fr-icon-arrow-go-back-line fr-link--icon-left">
                Recommencer la simulation
              </a>
            </div>

            <div className="px-4 md:px-8 pb-4 md:pb-0 fr-mt-4w md:fr-mt-6w">
              {/* Titre */}
              <h5 className="fr-mb-2w">{formTitle}</h5>

              {/* Sous-titre */}
              <p className="fr-text--lg fr-mb-2w">Éligibilité du demandeur</p>

              {/* Barre de progression complète */}
              <ProgressBar currentStep={TOTAL_ETAPES} totalSteps={TOTAL_ETAPES} />

              {/* Callout éligibilité */}
              {isEligible ? (
                <div className="fr-callout fr-icon-checkbox-fill fr-callout--green-emeraude fr-mt-4w">
                  <h3 className="fr-callout__title">Éligible au Fonds Argile</h3>
                  <p className="fr-callout__text">Résultat basé sur les informations fournies</p>
                </div>
              ) : (
                <div className="fr-callout fr-icon-warning-line fr-callout--pink-macaron fr-mt-4w">
                  <h3 className="fr-callout__title">Non éligible au Fonds Argile</h3>
                  <p className="fr-callout__text">Résultat basé sur les informations fournies</p>
                </div>
              )}

              {/* Résumé des modifications */}
              <ModificationsSummary modifications={modifications} />

              {/* Callout "Que se passe-t-il ensuite ?" */}
              <div className="fr-callout fr-mt-4w">
                <h3 className="fr-callout__title">Que se passe-t-il ensuite ?</h3>
                <p className="fr-callout__text">
                  Vous pouvez enregistrer les modifications ou fermer cette fenêtre si vous ne souhaitez pas les
                  sauvegarder. Pensez à informer le demandeur de la mise à jour de sa demande.
                </p>
              </div>

              {/* Détails d'éligibilité (accordéon fermé par défaut) */}
              <EligibilityChecksList checks={checks} isEligible={isEligible} defaultCollapsed />

              {/* Message d'erreur */}
              {error && (
                <div className="fr-alert fr-alert--error fr-alert--sm fr-mt-2w">
                  <p>{error}</p>
                </div>
              )}

              {/* Boutons de navigation */}
              <div className="fr-mt-4w flex flex-col-reverse md:flex-row md:justify-end gap-2">
                <button
                  type="button"
                  className="fr-btn fr-btn--secondary fr-icon-arrow-left-line fr-btn--icon-left !w-full md:!w-auto justify-center"
                  onClick={onBack}
                  disabled={isSaving}>
                  Précédent
                </button>
                <button
                  type="button"
                  className="fr-btn fr-icon-save-3-line fr-btn--icon-left !w-full md:!w-auto justify-center"
                  onClick={handleSave}
                  disabled={isSaving}>
                  Enregistrer les modifications
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modale de confirmation */}
      <ConfirmationSaveModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmSave}
        isLoading={isSaving}
      />
    </div>
  );
}
