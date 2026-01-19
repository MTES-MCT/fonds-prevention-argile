"use client";

import React, { useState } from "react";
import { formatDate } from "@/shared/utils/date.utils";
import { UserDetailRow } from "./UserDetailRow";
import { UserWithParcoursDetails, EmailTrackingStatus } from "@/features/backoffice";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { DSStatus } from "@/shared/domain/value-objects";

interface UsersTableProps {
  users: UserWithParcoursDetails[];
}

/**
 * Récupère le nom complet de l'utilisateur
 */
function getUserFullName(user: UserWithParcoursDetails): string {
  const prenom = user.user.firstName;
  const nom = user.user.name;

  if (prenom && nom) {
    return `${prenom} ${nom}`;
  }
  if (prenom) return prenom;
  if (nom) return nom;

  return "Non renseigné";
}

/**
 * Récupère la commune et le département avec fallback sur adresse_logement
 */
function getCommuneInfo(user: UserWithParcoursDetails): string {
  const commune = user.rgaSimulation?.logement?.commune_nom;
  const departement = user.rgaSimulation?.logement?.code_departement;

  if (commune && departement) {
    return `${commune} (${departement})`;
  }
  if (commune) return commune;
  if (departement) return departement;

  const adresseLogement = user.amoValidation?.userData?.adresseLogement;
  if (adresseLogement) {
    return adresseLogement;
  }

  return "—";
}

/**
 * Récupère le libellé de l'étape en cours
 */
function getStepLabel(step: Step | undefined): string {
  if (!step) return "—";

  const stepLabels: Record<Step, string> = {
    [Step.CHOIX_AMO]: "1. Sélection d'un AMO",
    [Step.ELIGIBILITE]: "2. Formulaire d'éligibilité",
    [Step.DIAGNOSTIC]: "3. Diagnostic",
    [Step.DEVIS]: "4. Devis",
    [Step.FACTURES]: "5. Factures",
  };

  return stepLabels[step] || step;
}

/**
 * Récupère le statut du tracking email
 */
function getEmailTrackingStatus(user: UserWithParcoursDetails): EmailTrackingStatus | null {
  const tracking = user.amoValidation?.emailTracking;
  if (!tracking) return null;

  if (tracking.bounceType === "hard") return "bounce_hard";
  if (tracking.bounceType === "soft") return "bounce_soft";
  if (tracking.clickedAt) return "clique";
  if (tracking.openedAt) return "ouvert";
  if (tracking.deliveredAt) return "delivre";
  if (tracking.sentAt) return "envoye";
  if (!tracking.brevoMessageId) return "non_envoye";

  return null;
}

/**
 * Composant pour afficher les badges de statut
 */
function StatusBadges({ user }: { user: UserWithParcoursDetails }) {
  const amoValidation = user.amoValidation;
  const emailTracking = getEmailTrackingStatus(user);
  const currentStep = user.parcours?.currentStep;

  // Badge statut AMO
  const renderAmoBadge = () => {
    if (!amoValidation) {
      return <span className="fr-badge fr-badge--warning fr-badge--sm">A FAIRE</span>;
    }

    switch (amoValidation.statut) {
      case StatutValidationAmo.EN_ATTENTE:
        return <span className="fr-badge fr-badge--info fr-badge--sm">AMO EN ATTENTE</span>;
      case StatutValidationAmo.LOGEMENT_ELIGIBLE:
        return <span className="fr-badge fr-badge--success fr-badge--sm">AMO VALIDÉ</span>;
      case StatutValidationAmo.LOGEMENT_NON_ELIGIBLE:
      case StatutValidationAmo.ACCOMPAGNEMENT_REFUSE:
        return <span className="fr-badge fr-badge--error fr-badge--sm">AMO REFUSÉ</span>;
      default:
        return null;
    }
  };

  // Badge tracking email
  const renderEmailBadge = () => {
    if (!amoValidation || !emailTracking) return null;

    switch (emailTracking) {
      case "non_envoye":
        return <span className="fr-badge fr-badge--error fr-badge--sm">EMAIL VALIDATION NON ENVOYÉ</span>;
      case "envoye":
        return <span className="fr-badge fr-badge--info fr-badge--sm">EMAIL ENVOYÉ</span>;
      case "delivre":
        return <span className="fr-badge fr-badge--success fr-badge--sm">EMAIL DÉLIVRÉ</span>;
      case "ouvert":
        return <span className="fr-badge fr-badge--success fr-badge--sm">EMAIL OUVERT</span>;
      case "clique":
        return <span className="fr-badge fr-badge--success fr-badge--sm">EMAIL CLIQUÉ</span>;
      case "bounce_soft":
        return <span className="fr-badge fr-badge--error fr-badge--sm">EMAIL BOUNCE SOFT</span>;
      case "bounce_hard":
        return <span className="fr-badge fr-badge--error fr-badge--sm">EMAIL BOUNCE HARD</span>;
      default:
        return null;
    }
  };

  // Badge instruction DS
  const renderInstructionBadge = () => {
    if (!currentStep) return null;

    let dossier = null;
    switch (currentStep) {
      case Step.ELIGIBILITE:
        dossier = user.dossiers.eligibilite;
        break;
      case Step.DIAGNOSTIC:
        dossier = user.dossiers.diagnostic;
        break;
      case Step.DEVIS:
        dossier = user.dossiers.devis;
        break;
      case Step.FACTURES:
        dossier = user.dossiers.factures;
        break;
      default:
        return null;
    }

    if (!dossier) return null;

    // Vérifier le vrai statut DS, pas seulement submittedAt
    switch (dossier.dsStatus) {
      case DSStatus.EN_CONSTRUCTION:
        return (
          <span className="fr-badge fr-badge--warning fr-badge--sm">
            BROUILLON CRÉÉ LE {formatDate(dossier.createdAt.toISOString())}
          </span>
        );

      case DSStatus.EN_INSTRUCTION:
        return (
          <span className="fr-badge fr-badge--info fr-badge--sm">
            EN INSTRUCTION{dossier.submittedAt ? ` LE ${formatDate(dossier.submittedAt.toISOString())}` : ""}
          </span>
        );

      case DSStatus.ACCEPTE:
        return (
          <span className="fr-badge fr-badge--success fr-badge--sm">
            ACCEPTÉ{dossier.processedAt ? ` LE ${formatDate(dossier.processedAt.toISOString())}` : ""}
          </span>
        );

      case DSStatus.REFUSE:
      case DSStatus.CLASSE_SANS_SUITE:
        return (
          <span className="fr-badge fr-badge--error fr-badge--sm">
            REFUSÉ{dossier.processedAt ? ` LE ${formatDate(dossier.processedAt.toISOString())}` : ""}
          </span>
        );

      case DSStatus.NON_ACCESSIBLE:
        return <span className="fr-badge fr-badge--error fr-badge--sm">NON ACCESSIBLE</span>;

      default:
        return null;
    }
  };

  return (
    <div className="fr-badges-group">
      {renderAmoBadge()}
      {renderEmailBadge()}
      {renderInstructionBadge()}
    </div>
  );
}

/**
 * Composant pour le lien de validation AMO
 */
function ValidationLink({ user }: { user: UserWithParcoursDetails }) {
  const token = user.amoValidation?.token;

  if (!token || token.usedAt) {
    return <span>—</span>;
  }

  const validationUrl = `/amo/validation/${token.token}`;

  return (
    <a
      href={validationUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fr-link fr-link--sm fr-icon-external-link-line fr-link--icon-right">
      Lien de validation
    </a>
  );
}

export function UsersTable({ users }: UsersTableProps) {
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const toggleExpand = (userId: string) => {
    setExpandedUserId(expandedUserId === userId ? null : userId);
  };

  return (
    <div className="fr-table fr-table--lg fr-table--bordered">
      <div className="fr-table__wrapper">
        <div className="fr-table__container">
          <div className="fr-table__content">
            <table>
              <caption className="sr-only">Liste des demandeurs</caption>
              <thead>
                <tr>
                  <th scope="col">Prénom Nom</th>
                  <th scope="col">Commune (Dpt)</th>
                  <th scope="col">Date d'inscription</th>
                  <th scope="col">Étape en cours</th>
                  <th scope="col">Étape en cours</th>
                  <th scope="col">Étape en cours</th>
                  <th scope="col">Étape en cours</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  return (
                    <React.Fragment key={user.user.id}>
                      <tr>
                        {/* Prénom Nom */}
                        <td>{getUserFullName(user)}</td>

                        {/* Commune (Dpt) */}
                        <td className="fr-text--sm">{getCommuneInfo(user)}</td>

                        {/* Date d'inscription */}
                        <td className="fr-text--sm">{formatDate(user.user.createdAt.toISOString())}</td>

                        {/* Étape en cours - Libellé */}
                        <td className="fr-text--sm">
                          {
                            <a className="fr-tag" href="#">
                              {getStepLabel(user.parcours?.currentStep)}
                            </a>
                          }
                        </td>

                        {/* Étape en cours - Badges de statut */}
                        <td style={{ minWidth: "300px" }}>
                          <StatusBadges user={user} />
                        </td>

                        {/* Lien de validation */}
                        <td>
                          <ValidationLink user={user} />
                        </td>

                        {/* Voir les détails */}
                        <td>
                          <button
                            type="button"
                            className="fr-btn fr-btn--sm fr-btn--secondary"
                            onClick={() => toggleExpand(user.user.id)}>
                            Voir les détails
                          </button>
                        </td>
                      </tr>

                      {/* Ligne détail dépliable */}
                      {expandedUserId === user.user.id && (
                        <tr>
                          <td colSpan={7}>
                            <div className="fr-p-4w" style={{ backgroundColor: "#f6f6f6" }}>
                              <UserDetailRow user={user} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
