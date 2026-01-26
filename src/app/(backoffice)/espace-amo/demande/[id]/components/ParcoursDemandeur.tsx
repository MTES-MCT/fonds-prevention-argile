import { Step } from "@/shared/domain/value-objects/step.enum";
import { formatDate } from "@/shared/utils";

interface ParcoursDemandeurProps {
  currentStep: Step;
  parcoursCreatedAt: Date;
}

interface StepConfig {
  step: Step | null;
  label: string;
  showDate?: boolean;
}

const STEPS_CONFIG: StepConfig[] = [
  { step: null, label: "Dossier créé", showDate: true },
  { step: Step.CHOIX_AMO, label: "Choisir un AMO" },
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
export function ParcoursDemandeur({ currentStep, parcoursCreatedAt }: ParcoursDemandeurProps) {
  const currentStepIndex = getStepIndex(currentStep);

  return (
    <div className="fr-card">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <h3 className="fr-card__title">
            <span className="fr-icon-list-ordered fr-mr-2v" aria-hidden="true"></span>
            Parcours du demandeur
          </h3>
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
