"use client";

import { UserWithParcoursDetails, EmailTrackingStatus } from "@/features/backoffice";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { formatDate } from "@/shared/utils/date.utils";

interface UserParcoursCardProps {
  user: UserWithParcoursDetails;
}

/**
 * Configuration des étapes du parcours
 */
const PARCOURS_STEPS = [
  {
    step: Step.CHOIX_AMO,
    label: "Contacter un AMO",
    shortLabel: "AMO",
  },
  {
    step: Step.ELIGIBILITE,
    label: "Éligibilité",
    shortLabel: "Éligibilité",
  },
  {
    step: Step.DIAGNOSTIC,
    label: "Diagnostic logement",
    shortLabel: "Diagnostic",
  },
  {
    step: Step.DEVIS,
    label: "Devis et accord",
    shortLabel: "Devis",
  },
  {
    step: Step.FACTURES,
    label: "Travaux et paiement",
    shortLabel: "Factures",
  },
] as const;

/**
 * Détermine l'état d'une étape par rapport à l'étape actuelle
 */
function getStepState(stepIndex: number, currentStepIndex: number): "done" | "current" | "todo" {
  if (stepIndex < currentStepIndex) return "done";
  if (stepIndex === currentStepIndex) return "current";
  return "todo";
}

/**
 * Détermine le statut du tracking email
 */
function getEmailTrackingStatus(
  emailTracking: NonNullable<UserWithParcoursDetails["amoValidation"]>["emailTracking"]
): EmailTrackingStatus {
  if (emailTracking.bounceType === "hard") return "bounce_hard";
  if (emailTracking.bounceType === "soft") return "bounce_soft";
  if (emailTracking.clickedAt) return "clique";
  if (emailTracking.openedAt) return "ouvert";
  if (emailTracking.deliveredAt) return "delivre";
  if (emailTracking.sentAt) return "envoye";
  return "non_envoye";
}

/**
 * Labels des statuts email
 */
const EMAIL_STATUS_LABELS: Record<EmailTrackingStatus, string> = {
  non_envoye: "Non envoyé",
  envoye: "Envoyé",
  delivre: "Délivré",
  ouvert: "Ouvert",
  clique: "Cliqué",
  bounce_soft: "Erreur",
  bounce_hard: "Erreur",
};

/**
 * Génère l'URL de validation AMO
 */
function getValidationUrl(token: string): string {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return `${baseUrl}/amo/validation/${token}`;
}

/**
 * Vérifie si le token est encore valide
 */
function isTokenValid(token: { expiresAt: Date; usedAt: Date | null }): boolean {
  return !token.usedAt && token.expiresAt > new Date();
}

export function UserParcoursCard({ user }: UserParcoursCardProps) {
  // Déterminer l'index de l'étape actuelle
  const currentStepIndex = user.parcours ? PARCOURS_STEPS.findIndex((s) => s.step === user.parcours!.currentStep) : -1;

  const emailStatus = user.amoValidation ? getEmailTrackingStatus(user.amoValidation.emailTracking) : null;

  return (
    <div className="fr-p-0">
      {/* Indicateur de progression horizontal */}
      <div className="fr-grid-row fr-grid-row--gutters fr-mb-3v" style={{ gap: "0.5rem" }}>
        {PARCOURS_STEPS.map((stepConfig, index) => {
          const state = currentStepIndex >= 0 ? getStepState(index, currentStepIndex) : "todo";

          return (
            <div key={stepConfig.step} className="fr-col" style={{ flex: "1 1 0", minWidth: 0 }}>
              <div
                className={`fr-p-2v fr-text--center ${
                  state === "done"
                    ? "fr-background-alt--green-tilleul-verveine"
                    : state === "current"
                      ? "fr-background-alt--brown-caramel"
                      : "fr-background-alt--grey"
                }`}
                style={{
                  border: state === "current" ? "2px solid var(--border-action-high-brown-caramel)" : "none",
                  borderRadius: "0.25rem",
                  position: "relative",
                }}>
                {/* Badge statut */}
                <div className="fr-mb-1v">
                  {state === "done" && (
                    <span className="fr-icon-checkbox-circle-fill fr-icon--sm" style={{ color: "#18753C" }} />
                  )}
                  {state === "current" && (
                    <span className="fr-badge fr-badge--sm fr-badge--brown-caramel">À faire</span>
                  )}
                  {state === "todo" && <span className="fr-badge fr-badge--sm fr-badge--new">À venir</span>}
                </div>

                {/* Numéro et label */}
                <div className="fr-text--xs fr-text--bold" style={{ wordBreak: "break-word" }}>
                  {index + 1}. {stepConfig.shortLabel}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Informations AMO si présente */}
      {user.amoValidation && (
        <div className="fr-callout fr-callout--sm fr-mb-0">
          <div className="fr-callout__text">
            {/* Nom de l'AMO */}
            <div className="fr-text--sm fr-mb-1v">
              AMO : <strong>{user.amoValidation.amo.nom}</strong>, demande faite le{" "}
              {formatDate(user.amoValidation.choisieAt.toISOString())}
            </div>

            {/* Statut AMO */}
            <div className="fr-text--sm fr-mb-2v">
              Statut AMO :{" "}
              <span
                className={`fr-badge fr-badge--sm fr-mr-1v ${
                  user.amoValidation.statut === StatutValidationAmo.LOGEMENT_ELIGIBLE
                    ? "fr-badge--success"
                    : user.amoValidation.statut === StatutValidationAmo.EN_ATTENTE
                      ? "fr-badge--green-archipel"
                      : user.amoValidation.statut === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE
                        ? "fr-badge--error"
                        : "fr-badge--warning"
                }`}>
                {user.amoValidation.statut === StatutValidationAmo.LOGEMENT_ELIGIBLE
                  ? "Validé"
                  : user.amoValidation.statut === StatutValidationAmo.EN_ATTENTE
                    ? "En attente"
                    : user.amoValidation.statut === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE
                      ? "Non éligible"
                      : "Refusé"}
              </span>
              - Email de validation :
              {emailStatus && (
                <span
                  className={`fr-badge fr-badge--sm fr-ml-1v ${
                    emailStatus === "clique" || emailStatus === "ouvert"
                      ? "fr-badge--success"
                      : emailStatus === "delivre" || emailStatus === "envoye"
                        ? "fr-badge--info"
                        : emailStatus === "bounce_hard" || emailStatus === "bounce_soft"
                          ? "fr-badge--error"
                          : "fr-badge--warning"
                  }`}>
                  <span className="fr-mr-1v" aria-hidden="true" />
                  {EMAIL_STATUS_LABELS[emailStatus]}
                </span>
              )}
            </div>

            {/* Lien de validation si token valide */}
            {user.amoValidation.token && isTokenValid(user.amoValidation.token) && (
              <a
                href={getValidationUrl(user.amoValidation.token.token)}
                target="_blank"
                rel="noopener noreferrer"
                className="fr-link fr-text--xs fr-icon-external-link-line fr-link--icon-right"
                title="Ouvrir le lien de validation">
                Lien de validation
              </a>
            )}
          </div>
        </div>
      )}

      {/* Message si pas d'AMO */}
      {!user.amoValidation && currentStepIndex === 0 && (
        <div className="fr-callout fr-callout--sm fr-callout--brown-caramel fr-mb-0">
          <p className="fr-callout__text fr-text--xs fr-mb-0">En attente de sélection d'une AMO</p>
        </div>
      )}
    </div>
  );
}
