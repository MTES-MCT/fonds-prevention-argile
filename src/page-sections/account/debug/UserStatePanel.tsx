import { useEffect, useState } from "react";
import { useParcours } from "@/lib/parcours/hooks/useParcours";
import {
  Step,
  Status,
  DSStatus,
  STEP_ORDER,
} from "@/lib/parcours/parcours.types";

// Types pour l'état utilisateur complet
interface UserStateInfo {
  parcours: {
    currentStep: Step | null;
    currentStatus: Status | null;
    steps: StepInfo[];
  };
  dossiers: DossierInfo[];
}

interface StepInfo {
  step: Step;
  label: string;
  status: "completed" | "current" | "upcoming" | "skipped";
  dsStatus?: DSStatus;
  date?: string;
}

interface DossierInfo {
  id: string;
  step: Step;
  dsNumber: string | null;
  dsStatus: DSStatus;
  dsUrl?: string;
  dateCreation?: string;
  dateModification?: string;
}

// Configuration des labels d'étapes
const STEP_LABELS: Record<Step, string> = {
  [Step.ELIGIBILITE]: "Vérification éligibilité",
  [Step.DIAGNOSTIC]: "Diagnostic technique",
  [Step.DEVIS]: "Devis travaux",
  [Step.FACTURES]: "Factures et finalisation",
};

// Configuration des statuts DS
const DS_STATUS_CONFIG: Record<
  DSStatus,
  { label: string; badgeType: "new" | "info" | "success" | "error" | "warning" }
> = {
  [DSStatus.EN_CONSTRUCTION]: { label: "En construction", badgeType: "new" },
  [DSStatus.EN_INSTRUCTION]: { label: "En instruction", badgeType: "info" },
  [DSStatus.ACCEPTE]: { label: "Accepté", badgeType: "success" },
  [DSStatus.REFUSE]: { label: "Refusé", badgeType: "error" },
  [DSStatus.CLASSE_SANS_SUITE]: { label: "Sans suite", badgeType: "warning" },
  [DSStatus.NON_ACCESSIBLE]: { label: "Non accessible", badgeType: "warning" },
};

export default function UserStatePanel() {
  const [userState, setUserState] = useState<UserStateInfo | null>(null);

  const {
    parcours,
    currentStep,
    currentStatus,
    dossiers,
    isLoading: isLoadingParcours,
    error: parcoursError,
    refresh,
  } = useParcours();

  // Construire l'état complet
  useEffect(() => {
    if (!isLoadingParcours) {
      // Construire les infos des étapes
      const steps: StepInfo[] = STEP_ORDER.map((step) => {
        const stepIndex = STEP_ORDER.indexOf(step);
        const currentIndex = currentStep ? STEP_ORDER.indexOf(currentStep) : -1;

        let status: StepInfo["status"];
        if (currentStep === step) {
          status = "current";
        } else if (currentIndex > stepIndex) {
          status = "completed";
        } else {
          status = "upcoming";
        }

        // Trouver le dossier DS associé
        const dossier = dossiers.find((d) => d.step === step);

        return {
          step,
          label: STEP_LABELS[step],
          status,
          dsStatus: dossier?.dsStatus,
          date: dossier?.createdAt
            ? new Date(dossier.createdAt).toLocaleDateString("fr-FR")
            : undefined,
        };
      });

      // Construire les infos des dossiers
      const dossiersInfo: DossierInfo[] = dossiers.map((d) => ({
        id: d.id,
        step: d.step,
        dsNumber: d.dsNumber,
        dsStatus: d.dsStatus,
        dsUrl: d.dsUrl || undefined,
        dateCreation: d.createdAt
          ? new Date(d.createdAt).toLocaleDateString("fr-FR")
          : undefined,
        dateModification: d.updatedAt
          ? new Date(d.updatedAt).toLocaleDateString("fr-FR")
          : undefined,
      }));

      setUserState({
        parcours: {
          currentStep,
          currentStatus,
          steps,
        },
        dossiers: dossiersInfo,
      });
    }
  }, [parcours, currentStep, currentStatus, dossiers, isLoadingParcours]);

  const isLoading = isLoadingParcours;

  if (isLoading) {
    return (
      <div className="fr-card">
        <div className="fr-card__body">
          <div className="fr-card__content">
            <p className="fr-text--sm">Chargement des données utilisateur...</p>
          </div>
        </div>
      </div>
    );
  }

  if (parcoursError) {
    return (
      <div className="fr-alert fr-alert--error fr-alert--sm">
        <p className="fr-alert__title">Erreur de chargement</p>
        <p className="fr-text--sm">{parcoursError}</p>
        <button onClick={refresh} className="fr-btn fr-btn--sm fr-mt-2w">
          Réessayer
        </button>
      </div>
    );
  }

  if (!userState) {
    return (
      <div className="fr-alert fr-alert--info fr-alert--sm">
        <p className="fr-alert__title">Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <div className="fr-card">
      <div className="fr-card__body">
        <div className="fr-card__content">
          {/* Section Parcours utilisateur */}
          <div className="fr-mb-3w">
            <h4 className="fr-h6 fr-mb-2w">
              <span
                className="fr-icon-road-map-line fr-mr-1w"
                aria-hidden="true"
              ></span>
              Parcours de l'utilisateur
            </h4>

            {/* Statut actuel du parcours */}
            {userState.parcours.currentStep &&
              userState.parcours.currentStatus && (
                <div className="fr-mb-2w">
                  <p className="fr-text--sm fr-mb-1v">
                    <strong>Étape actuelle :</strong>{" "}
                    {STEP_LABELS[userState.parcours.currentStep]}
                  </p>
                </div>
              )}

            <hr className="fr-mb-2w fr-mt-2w" />
            <ol className="fr-stepper">
              {userState.parcours.steps.map((step) => (
                <li
                  key={step.step}
                  className={`
                    fr-stepper__item
                    ${step.status === "completed" ? "fr-stepper__item--success" : ""}
                    ${step.status === "current" ? "fr-stepper__item--info" : ""}
                    ${step.status === "skipped" ? "fr-stepper__item--disabled" : ""}
                  `}
                >
                  <span className="fr-stepper__details">
                    <span className="fr-text--sm fr-text--bold">
                      {step.label} {step.status === "completed" ? "✓" : ""}
                    </span>
                    {step.status === "current" && (
                      <span className="fr-badge fr-badge--sm fr-badge--success fr-ml-1w">
                        Étape actuelle
                      </span>
                    )}
                    {step.dsStatus && (
                      <span
                        className={`fr-badge fr-badge--sm fr-badge--${DS_STATUS_CONFIG[step.dsStatus].badgeType} fr-ml-1w`}
                      >
                        {DS_STATUS_CONFIG[step.dsStatus].label}
                      </span>
                    )}
                    {step.date && (
                      <span className="fr-text--xs fr-text--mention-grey fr-ml-1w">
                        ({step.date})
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Section 3: Démarches */}
          <div>
            <h4 className="fr-h6 fr-mb-2w">
              <span
                className="fr-icon-file-text-line fr-mr-1w"
                aria-hidden="true"
              ></span>
              Dossiers Démarches Simplifiées
            </h4>

            {userState.dossiers.length === 0 ? (
              <div className="fr-alert fr-alert--info fr-alert--sm">
                <p className="fr-alert__title">Aucun dossier en cours</p>
              </div>
            ) : (
              <div className="fr-table">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Étape</th>
                      <th scope="col">N° Dossier</th>
                      <th scope="col">Statut DS</th>
                      <th scope="col">Dates</th>
                      <th scope="col">Lien</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userState.dossiers.map((dossier) => {
                      const statusInfo = DS_STATUS_CONFIG[dossier.dsStatus];
                      return (
                        <tr key={dossier.id}>
                          <td className="fr-text--sm">
                            {STEP_LABELS[dossier.step]}
                          </td>
                          <td>
                            <code className="fr-text--xs">
                              {dossier.dsNumber || "N/A"}
                            </code>
                          </td>
                          <td>
                            <span
                              className={`fr-badge fr-badge--sm fr-badge--${statusInfo.badgeType}`}
                            >
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="fr-text--xs">
                            {dossier.dateCreation && (
                              <div>Créé : {dossier.dateCreation}</div>
                            )}
                            {dossier.dateModification && (
                              <div>Modifié : {dossier.dateModification}</div>
                            )}
                          </td>
                          <td>
                            {dossier.dsUrl && (
                              <a
                                href={dossier.dsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="fr-link fr-link--sm"
                                title="Voir sur DS"
                              >
                                Démarche
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bouton de rafraîchissement */}
          <div className="fr-mt-3w">
            <button
              onClick={refresh}
              className="fr-btn fr-btn--sm fr-btn--secondary fr-btn--icon-left"
            >
              <span className="fr-icon-refresh-line" aria-hidden="true"></span>
              Rafraîchir les données
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
