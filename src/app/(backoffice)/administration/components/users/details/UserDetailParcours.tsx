"use client";

import { UserWithParcoursDetails } from "@/features/backoffice";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { formatDateTime } from "@/shared/utils/date.utils";

interface UserDetailParcoursProps {
  user: UserWithParcoursDetails;
}

/**
 * Configuration des étapes du parcours
 */
const PARCOURS_STEPS_CONFIG = [
  { step: Step.CHOIX_AMO, label: "Choix AMO" },
  { step: Step.ELIGIBILITE, label: "Éligibilité" },
  { step: Step.DIAGNOSTIC, label: "Diagnostic" },
  { step: Step.DEVIS, label: "Devis" },
  { step: Step.FACTURES, label: "Factures" },
] as const;

export function UserDetailParcours({ user }: UserDetailParcoursProps) {
  return (
    <div>
      <h3 className="fr-h6 fr-mb-3w">Timeline du parcours</h3>

      {/* Timeline verticale */}
      <div className="fr-ml-2w fr-mb-4v" style={{ borderLeft: "2px solid var(--border-default-grey)" }}>
        {/* Inscription */}
        <div className="fr-pl-3w fr-pb-3w" style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              left: "-9px",
              top: "4px",
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              backgroundColor: "var(--background-action-high-blue-france)",
            }}
          />
          <div className="fr-text--bold">Inscription</div>
          <div className="fr-text--sm fr-text-mention--grey">{formatDateTime(user.user.createdAt.toISOString())}</div>
        </div>

        {/* Simulation RGA */}
        {user.parcours?.rgaSimulationCompletedAt && (
          <div className="fr-pl-3w fr-pb-3w" style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: "-9px",
                top: "4px",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                backgroundColor: "var(--background-action-high-blue-france)",
              }}
            />
            <div className="fr-text--bold">Simulation complétée</div>
            <div className="fr-text--sm fr-text-mention--grey">
              {formatDateTime(user.parcours.rgaSimulationCompletedAt.toISOString())}
            </div>
          </div>
        )}

        {/* AMO choisie */}
        {user.amoValidation && (
          <div className="fr-pl-3w fr-pb-3w" style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: "-9px",
                top: "4px",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                backgroundColor: "var(--background-action-high-blue-france)",
              }}
            />
            <div className="fr-text--bold">AMO sélectionnée</div>
            <div className="fr-text--sm fr-text-mention--grey">
              {formatDateTime(user.amoValidation.choisieAt.toISOString())}
            </div>
            <div className="fr-text--sm">{user.amoValidation.amo.nom}</div>
          </div>
        )}

        {/* AMO validée */}
        {user.amoValidation?.valideeAt && (
          <div className="fr-pl-3w fr-pb-3w" style={{ position: "relative" }}>
            <div
              style={{
                position: "absolute",
                left: "-9px",
                top: "4px",
                width: "16px",
                height: "16px",
                borderRadius: "50%",
                backgroundColor:
                  user.amoValidation.statut === StatutValidationAmo.LOGEMENT_ELIGIBLE
                    ? "var(--background-action-high-success)"
                    : "var(--background-action-high-error)",
              }}
            />
            <div className="fr-text--bold">
              {user.amoValidation.statut === StatutValidationAmo.LOGEMENT_ELIGIBLE ? "AMO validée" : "AMO refusée"}
            </div>
            <div className="fr-text--sm fr-text-mention--grey">
              {formatDateTime(user.amoValidation.valideeAt.toISOString())}
            </div>
          </div>
        )}

        {/* Étapes du parcours */}
        {user.parcours && (
          <>
            {PARCOURS_STEPS_CONFIG.map((stepConfig, index) => {
              const currentStepIndex = PARCOURS_STEPS_CONFIG.findIndex((s) => s.step === user.parcours!.currentStep);
              const isPast = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;

              if (!isPast && !isCurrent) return null;

              return (
                <div key={stepConfig.step} className="fr-pl-3w fr-pb-3w" style={{ position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "-9px",
                      top: "4px",
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      backgroundColor: isCurrent
                        ? "var(--background-action-high-brown-caramel)"
                        : "var(--background-action-high-success)",
                    }}
                  />
                  <div className="fr-text--bold">{stepConfig.label}</div>
                  {isCurrent && (
                    <span className="fr-badge fr-badge--sm fr-badge--brown-caramel fr-mt-1v">En cours</span>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Dernière connexion */}
      <p className="fr-badge fr-badge--new ">
        Dernière connexion : {formatDateTime(user.user.lastLogin.toISOString())}
      </p>
    </div>
  );
}
