"use client";

import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { formatDateTime } from "@/shared/utils/date.utils";
import { UserWithParcoursDetails } from "@/features/parcours/core";

interface UserTimelineProps {
  user: UserWithParcoursDetails;
}

interface TimelineEvent {
  date: Date | null;
  label: string;
  icon: string;
  colorClass: string;
  status: "completed" | "pending";
}

/**
 * Timeline verticale des événements d'un utilisateur
 */
export function UserTimeline({ user }: UserTimelineProps) {
  const events: TimelineEvent[] = [];

  // 1. Compte créé (toujours présent)
  events.push({
    date: user.user.createdAt,
    label: "Compte créé",
    icon: "fr-icon-account-circle-line",
    colorClass: "text-blue-500",
    status: "completed",
  });

  // 2. Simulation RGA complétée
  if (user.parcours?.rgaSimulationCompletedAt) {
    events.push({
      date: user.parcours.rgaSimulationCompletedAt,
      label: "Simulation RGA complétée",
      icon: "fr-icon-home-4-line",
      colorClass: "text-blue-500",
      status: "completed",
    });
  } else if (user.parcours) {
    events.push({
      date: null,
      label: "Simulation RGA - En attente",
      icon: "fr-icon-time-line",
      colorClass: "text-gray-400",
      status: "pending",
    });
  }

  // 3. AMO demandée
  if (user.amoValidation) {
    events.push({
      date: user.amoValidation.choisieAt,
      label: `AMO demandée (${user.amoValidation.amo.nom})`,
      icon: "fr-icon-mail-send-line",
      colorClass: "text-blue-500",
      status: "completed",
    });

    // 3b. AMO validée ou refusée
    if (user.amoValidation.valideeAt) {
      if (user.amoValidation.statut === StatutValidationAmo.LOGEMENT_ELIGIBLE) {
        events.push({
          date: user.amoValidation.valideeAt,
          label: `AMO validée par ${user.amoValidation.amo.nom}`,
          icon: "fr-icon-checkbox-circle-line",
          colorClass: "text-green-500",
          status: "completed",
        });
      } else if (user.amoValidation.statut === StatutValidationAmo.ACCOMPAGNEMENT_REFUSE) {
        events.push({
          date: user.amoValidation.valideeAt,
          label: `AMO refusée par ${user.amoValidation.amo.nom}`,
          icon: "fr-icon-close-circle-line",
          colorClass: "text-red-500",
          status: "completed",
        });
      }
    } else {
      // En attente de validation
      events.push({
        date: null,
        label: "Validation AMO - En attente",
        icon: "fr-icon-time-line",
        colorClass: "text-yellow-500",
        status: "pending",
      });
    }
  } else if (user.parcours && user.parcours.currentStep === Step.CHOIX_AMO) {
    events.push({
      date: null,
      label: "Choix AMO - En attente",
      icon: "fr-icon-time-line",
      colorClass: "text-gray-400",
      status: "pending",
    });
  }

  // 4. Dossiers DS - Éligibilité
  if (user.dossiers.eligibilite) {
    events.push({
      date: user.dossiers.eligibilite.createdAt,
      label: `Dossier éligibilité créé (${user.dossiers.eligibilite.dsNumber || "en construction"})`,
      icon: "fr-icon-file-text-line",
      colorClass: "text-blue-500",
      status: "completed",
    });

    if (user.dossiers.eligibilite.submittedAt) {
      events.push({
        date: user.dossiers.eligibilite.submittedAt,
        label: "Dossier éligibilité déposé",
        icon: "fr-icon-upload-line",
        colorClass: "text-blue-500",
        status: "completed",
      });
    }

    if (user.dossiers.eligibilite.processedAt) {
      const isAccepted = user.dossiers.eligibilite.dsStatus === DSStatus.ACCEPTE;
      events.push({
        date: user.dossiers.eligibilite.processedAt,
        label: isAccepted ? "Dossier éligibilité accepté" : "Dossier éligibilité refusé",
        icon: isAccepted ? "fr-icon-checkbox-circle-line" : "fr-icon-close-circle-line",
        colorClass: isAccepted ? "text-green-500" : "text-red-500",
        status: "completed",
      });
    }
  } else if (
    user.parcours &&
    [Step.ELIGIBILITE, Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES].includes(user.parcours.currentStep)
  ) {
    events.push({
      date: null,
      label: "Dossier éligibilité - En attente",
      icon: "fr-icon-time-line",
      colorClass: "text-gray-400",
      status: "pending",
    });
  }

  // 5. Dossiers DS - Diagnostic
  if (user.dossiers.diagnostic) {
    events.push({
      date: user.dossiers.diagnostic.createdAt,
      label: `Dossier diagnostic créé (${user.dossiers.diagnostic.dsNumber || "en construction"})`,
      icon: "fr-icon-file-text-line",
      colorClass: "text-blue-500",
      status: "completed",
    });

    if (user.dossiers.diagnostic.submittedAt) {
      events.push({
        date: user.dossiers.diagnostic.submittedAt,
        label: "Dossier diagnostic déposé",
        icon: "fr-icon-upload-line",
        colorClass: "text-blue-500",
        status: "completed",
      });
    }

    if (user.dossiers.diagnostic.processedAt) {
      const isAccepted = user.dossiers.diagnostic.dsStatus === DSStatus.ACCEPTE;
      events.push({
        date: user.dossiers.diagnostic.processedAt,
        label: isAccepted ? "Dossier diagnostic accepté" : "Dossier diagnostic refusé",
        icon: isAccepted ? "fr-icon-checkbox-circle-line" : "fr-icon-close-circle-line",
        colorClass: isAccepted ? "text-green-500" : "text-red-500",
        status: "completed",
      });
    }
  } else if (user.parcours && [Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES].includes(user.parcours.currentStep)) {
    events.push({
      date: null,
      label: "Dossier diagnostic - En attente",
      icon: "fr-icon-time-line",
      colorClass: "text-gray-400",
      status: "pending",
    });
  }

  // 6. Dossiers DS - Devis
  if (user.dossiers.devis) {
    events.push({
      date: user.dossiers.devis.createdAt,
      label: `Dossier devis créé (${user.dossiers.devis.dsNumber || "en construction"})`,
      icon: "fr-icon-file-text-line",
      colorClass: "text-blue-500",
      status: "completed",
    });

    if (user.dossiers.devis.submittedAt) {
      events.push({
        date: user.dossiers.devis.submittedAt,
        label: "Dossier devis déposé",
        icon: "fr-icon-upload-line",
        colorClass: "text-blue-500",
        status: "completed",
      });
    }

    if (user.dossiers.devis.processedAt) {
      const isAccepted = user.dossiers.devis.dsStatus === DSStatus.ACCEPTE;
      events.push({
        date: user.dossiers.devis.processedAt,
        label: isAccepted ? "Dossier devis accepté" : "Dossier devis refusé",
        icon: isAccepted ? "fr-icon-checkbox-circle-line" : "fr-icon-close-circle-line",
        colorClass: isAccepted ? "text-green-500" : "text-red-500",
        status: "completed",
      });
    }
  } else if (user.parcours && [Step.DEVIS, Step.FACTURES].includes(user.parcours.currentStep)) {
    events.push({
      date: null,
      label: "Dossier devis - En attente",
      icon: "fr-icon-time-line",
      colorClass: "text-gray-400",
      status: "pending",
    });
  }

  // 7. Dossiers DS - Factures
  if (user.dossiers.factures) {
    events.push({
      date: user.dossiers.factures.createdAt,
      label: `Dossier factures créé (${user.dossiers.factures.dsNumber || "en construction"})`,
      icon: "fr-icon-file-text-line",
      colorClass: "text-blue-500",
      status: "completed",
    });

    if (user.dossiers.factures.submittedAt) {
      events.push({
        date: user.dossiers.factures.submittedAt,
        label: "Dossier factures déposé",
        icon: "fr-icon-upload-line",
        colorClass: "text-blue-500",
        status: "completed",
      });
    }

    if (user.dossiers.factures.processedAt) {
      const isAccepted = user.dossiers.factures.dsStatus === DSStatus.ACCEPTE;
      events.push({
        date: user.dossiers.factures.processedAt,
        label: isAccepted ? "Dossier factures accepté" : "Dossier factures refusé",
        icon: isAccepted ? "fr-icon-checkbox-circle-line" : "fr-icon-close-circle-line",
        colorClass: isAccepted ? "text-green-500" : "text-red-500",
        status: "completed",
      });
    }
  } else if (user.parcours && user.parcours.currentStep === Step.FACTURES) {
    events.push({
      date: null,
      label: "Dossier factures - En attente",
      icon: "fr-icon-time-line",
      colorClass: "text-gray-400",
      status: "pending",
    });
  }

  // 8. Parcours terminé
  if (user.parcours?.completedAt) {
    events.push({
      date: user.parcours.completedAt,
      label: "Parcours terminé",
      icon: "fr-icon-success-line",
      colorClass: "text-green-500",
      status: "completed",
    });
  }

  // 9. Dernière connexion
  events.push({
    date: user.user.lastLogin,
    label: "Dernière connexion",
    icon: "fr-icon-login-box-line",
    colorClass: "text-blue-500",
    status: "completed",
  });

  // Trier par date (plus récent en premier)
  // Les événements sans date (pending) sont mis à la fin
  events.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return 1;
    return b.date.getTime() - a.date.getTime();
  });

  return (
    <div className="timeline">
      <ul className="fr-raw-list">
        {events.map((event, index) => (
          <li key={index} className="fr-mb-2w" style={{ display: "flex", alignItems: "flex-start" }}>
            <span
              className={`${event.icon} fr-mr-2w`}
              style={{
                fontSize: "1.5rem",
                color: event.status === "completed" ? "inherit" : "#666",
              }}
              aria-hidden="true"></span>
            <div style={{ flex: 1 }}>
              <p className={`fr-mb-0 ${event.status === "pending" ? "fr-text--italic" : ""}`}>
                <strong className={event.colorClass}>{event.label}</strong>
              </p>
              {event.date && (
                <p className="fr-text--sm fr-mb-0 text-gray-600">{formatDateTime(event.date.toISOString())}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
