import { Step } from "@/shared/domain/value-objects/step.enum";
import { formatDate, daysBetween } from "@/shared/utils";

interface ParcoursDemandeurProps {
  currentStep: Step;
  parcoursCreatedAt: Date;
  /** Date de dernière mise à jour pour afficher le nombre de jours depuis dernière action */
  lastUpdatedAt?: Date;
}

interface StepConfig {
  step: Step | null;
  label: string;
  showDate?: boolean;
}

const STEPS_CONFIG: StepConfig[] = [
  { step: null, label: "Dossier créé", showDate: true },
  { step: Step.CHOIX_AMO, label: "AMO validé" },
  { step: Step.ELIGIBILITE, label: "Soumettre le formulaire d'éligibilité" },
  { step: Step.DIAGNOSTIC, label: "Soumettre le diagnostic" },
  { step: Step.DEVIS, label: "Soumettre les devis" },
  { step: Step.FACTURES, label: "Transmettre les factures" },
];

function getStepIndex(step: Step): number {
  return STEPS_CONFIG.findIndex((s) => s.step === step);
}

/**
 * Composant affichant le parcours du demandeur
 */
export function ParcoursDemandeur({ currentStep, parcoursCreatedAt, lastUpdatedAt }: ParcoursDemandeurProps) {
  const currentStepIndex = getStepIndex(currentStep);

  // Calcul du nombre de jours depuis dernière action
  const daysSinceLastAction = lastUpdatedAt ? daysBetween(lastUpdatedAt, new Date()) : null;

  return (
    <div className="fr-card">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <h3 className="fr-card__title">
            <span className="fr-icon-list-ordered fr-mr-2v" aria-hidden="true"></span>
            Parcours du demandeur
          </h3>

          {/* Badge nombre de jours depuis dernière action */}
          {daysSinceLastAction !== null && daysSinceLastAction > 0 && (
            <div className="fr-mt-2w fr-mb-2w">
              <p className="fr-badge fr-badge--warning fr-badge--no-icon">
                <span className="fr-icon-warning-fill fr-icon--sm fr-mr-1v" aria-hidden="true"></span>
                {daysSinceLastAction} jour{daysSinceLastAction > 1 ? "s" : ""} depuis dernière action
              </p>
            </div>
          )}

          <div className="fr-card__desc">
            <ul className="fr-raw-list fr-mt-2w">
              {STEPS_CONFIG.map((stepConfig, index) => {
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const isPending = index > currentStepIndex;

                return (
                  <li key={index} className="fr-mb-2w">
                    {isCompleted && (
                      <span className="fr-icon-success-fill fr-icon--sm fr-mr-1v text-green-600" aria-hidden="true" />
                    )}
                    {isCurrent && (
                      <span className="fr-mr-1v" aria-hidden="true">
                        &rarr;
                      </span>
                    )}
                    {isPending && <span className="fr-mr-3v" aria-hidden="true" />}
                    <span className={isCurrent ? "fr-text--bold" : isCompleted ? "fr-text--regular" : "text-gray-400"}>
                      {index + 1}. {stepConfig.label}
                      {stepConfig.showDate && ` (${formatDate(parcoursCreatedAt.toISOString())})`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
