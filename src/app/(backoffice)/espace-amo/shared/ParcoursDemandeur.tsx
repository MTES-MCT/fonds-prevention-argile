import { Step } from "@/shared/domain/value-objects/step.enum";
import { formatDate, daysBetween } from "@/shared/utils";

interface ParcoursDateProgression {
  compteCreatedAt: Date;
  amoChoisieAt?: Date;
  eligibiliteSubmittedAt?: Date;
  diagnosticSubmittedAt?: Date;
  devisSubmittedAt?: Date;
  facturesSubmittedAt?: Date;
}

interface ParcoursDemandeurProps {
  currentStep: Step;
  dates: ParcoursDateProgression;
  /** Date de dernière mise à jour pour afficher le nombre de jours depuis dernière action */
  lastUpdatedAt?: Date;
}

interface StepConfig {
  step: Step | null;
  label: string;
  dateKey: keyof ParcoursDateProgression;
}

const STEPS_CONFIG: StepConfig[] = [
  { step: null, label: "Compte créé", dateKey: "compteCreatedAt" },
  { step: Step.CHOIX_AMO, label: "Choisir un AMO", dateKey: "amoChoisieAt" },
  { step: Step.ELIGIBILITE, label: "Soumettre le formulaire d'éligibilité", dateKey: "eligibiliteSubmittedAt" },
  { step: Step.DIAGNOSTIC, label: "Soumettre le diagnostic", dateKey: "diagnosticSubmittedAt" },
  { step: Step.DEVIS, label: "Soumettre les devis", dateKey: "devisSubmittedAt" },
  { step: Step.FACTURES, label: "Transmettre les factures", dateKey: "facturesSubmittedAt" },
];

function getStepIndex(step: Step): number {
  return STEPS_CONFIG.findIndex((s) => s.step === step);
}

/**
 * Composant affichant le parcours du demandeur
 */
export function ParcoursDemandeur({ currentStep, dates, lastUpdatedAt }: ParcoursDemandeurProps) {
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
            <div className="fr-card__desc fr-mt-2w">
              <p className="fr-badge fr-badge--yellow-tournesol fr-icon-warning-fill fr-badge--icon-left">
                {daysSinceLastAction} jour{daysSinceLastAction > 1 ? "s" : ""} depuis dernière action
              </p>
            </div>
          )}

          <div className="fr-card__desc">
            <ul className="fr-raw-list">
              {STEPS_CONFIG.map((stepConfig, index) => {
                const isCompleted = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const isPending = index > currentStepIndex;
                const stepDate = dates[stepConfig.dateKey];

                return (
                  <li key={index} className="fr-mb-2w">
                    {/* Icône de statut */}
                    {isCompleted && (
                      <span className="fr-icon-success-fill fr-icon--sm fr-mr-1v text-green-600" aria-hidden="true" />
                    )}
                    {isCurrent && (
                      <span className="fr-mr-1v" aria-hidden="true">
                        &rarr;
                      </span>
                    )}
                    {isPending && <span className="fr-mr-3v" aria-hidden="true" />}

                    {/* Label de l'étape */}
                    <span className={isCurrent ? "fr-text--bold" : isCompleted ? "fr-text--regular" : "text-gray-400"}>
                      {index + 1}. {stepConfig.label}

                      {/* Date entre parenthèses pour les étapes complétées */}
                      {isCompleted && stepDate && (
                        <span> ({formatDate(stepDate.toISOString())})</span>
                      )}
                    </span>

                    {/* Badge pour l'étape en cours (si date disponible) */}
                    {isCurrent && stepDate && (
                      <span className="fr-ml-2v">
                        <span className="fr-badge fr-badge--blue-ecume fr-badge--sm">
                          DEMANDE ENVOYÉE LE {formatDate(stepDate.toISOString()).toUpperCase()}
                        </span>
                      </span>
                    )}
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
