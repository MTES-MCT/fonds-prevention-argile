"use client";

import React, { useState } from "react";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { formatDate } from "@/shared/utils/date.utils";
import { UserDetailRow } from "./UserDetailRow";
import { UserWithParcoursDetails } from "@/features/parcours/core";

interface UsersTableProps {
  users: UserWithParcoursDetails[];
}

/**
 * Labels français des étapes
 */
const STEP_LABELS: Record<Step, string> = {
  [Step.CHOIX_AMO]: "1. Choix de l'AMO",
  [Step.ELIGIBILITE]: "2. Éligibilité",
  [Step.DIAGNOSTIC]: "3. Diagnostic",
  [Step.DEVIS]: "4. Devis",
  [Step.FACTURES]: "5. Factures",
} as const;

/**
 * Labels français des statuts AMO
 */
const STATUT_AMO_LABELS: Record<StatutValidationAmo, string> = {
  [StatutValidationAmo.EN_ATTENTE]: "En attente",
  [StatutValidationAmo.LOGEMENT_ELIGIBLE]: "Validé",
  [StatutValidationAmo.LOGEMENT_NON_ELIGIBLE]: "Non éligible",
  [StatutValidationAmo.ACCOMPAGNEMENT_REFUSE]: "Refusé",
};

/**
 * Classes CSS DSFR pour les badges de statut AMO
 */
const STATUT_AMO_BADGE_CLASSES: Record<StatutValidationAmo, string> = {
  [StatutValidationAmo.EN_ATTENTE]: "fr-badge--green-archipel",
  [StatutValidationAmo.LOGEMENT_ELIGIBLE]: "fr-badge--success",
  [StatutValidationAmo.LOGEMENT_NON_ELIGIBLE]: "fr-badge--error",
  [StatutValidationAmo.ACCOMPAGNEMENT_REFUSE]: "fr-badge--warning",
};

/**
 * Récupère le nom complet de l'utilisateur
 */
function getUserFullName(user: UserWithParcoursDetails): string {
  const prenom = user.amoValidation?.userData.prenom;
  const nom = user.amoValidation?.userData.nom;

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
  // Source 1 : rgaSimulation (préféré, données structurées)
  const commune = user.rgaSimulation?.logement?.commune;
  const departement = user.rgaSimulation?.logement?.departement;

  if (commune && departement) {
    return `${commune} (${departement})`;
  }
  if (commune) return commune;
  if (departement) return departement;

  // Source 2 : Fallback sur adresse_logement (moins précis mais mieux que rien)
  const adresseLogement = user.amoValidation?.userData?.adresseLogement;
  if (adresseLogement) {
    return adresseLogement;
  }

  return "—";
}

/**
 * Détermine l'état d'un token de validation
 */
function getTokenStatus(token: { expiresAt: Date; usedAt: Date | null }): {
  label: string;
  badgeClass: string;
  isValid: boolean;
} {
  const now = new Date();

  // Token déjà utilisé
  if (token.usedAt) {
    return {
      label: "Utilisé",
      badgeClass: "fr-badge--info",
      isValid: false,
    };
  }

  // Token expiré
  if (token.expiresAt < now) {
    return {
      label: "Expiré",
      badgeClass: "fr-badge--error",
      isValid: false,
    };
  }

  // Token valide
  return {
    label: "Valide",
    badgeClass: "fr-badge--success",
    isValid: true,
  };
}

/**
 * Génère l'URL complète du lien de validation AMO
 */
function getValidationUrl(token: string): string {
  // Récupère l'URL de base (window.location.origin en client-side)
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return `${baseUrl}/amo/validation/${token}`;
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
              <caption className="sr-only">Liste des utilisateurs</caption>
              <thead>
                <tr>
                  <th scope="col">Actions</th>
                  <th scope="col">Nom</th>
                  <th scope="col">Email</th>
                  <th scope="col">Téléphone</th>
                  <th scope="col">Commune (Dpt)</th>
                  <th scope="col">Date d'inscription</th>
                  <th scope="col">Étape actuelle</th>
                  <th scope="col">Nom de l'AMO</th>
                  <th scope="col">Statut AMO</th>
                  <th scope="col">Lien validation AMO</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <React.Fragment key={user.user.id}>
                    <tr key={user.user.id}>
                      {/* Actions */}
                      <td>
                        <button
                          type="button"
                          className="fr-btn fr-btn--sm fr-btn--secondary"
                          onClick={() => toggleExpand(user.user.id)}
                          title={expandedUserId === user.user.id ? "Masquer les détails" : "Voir les détails"}>
                          {expandedUserId === user.user.id ? "Masquer" : "Voir détails"}
                        </button>
                      </td>

                      {/* Nom */}
                      <td>{getUserFullName(user)}</td>

                      {/* Email */}
                      <td className="fr-text--sm">{user.user.email || "—"}</td>

                      {/* Téléphone */}
                      <td className="fr-text--sm">{user.user.telephone || "—"}</td>

                      {/* Commune */}
                      <td className="fr-text--sm">{getCommuneInfo(user)}</td>

                      {/* Date d'inscription */}
                      <td className="fr-text--sm">{formatDate(user.user.createdAt.toISOString())}</td>

                      {/* Étape actuelle */}
                      <td>
                        {user.parcours ? (
                          <span className="fr-badge fr-badge--sm fr-badge--blue-ecume">
                            {STEP_LABELS[user.parcours.currentStep]}
                          </span>
                        ) : (
                          <span className="fr-badge fr-badge--sm fr-badge--new">Aucun parcours</span>
                        )}
                      </td>

                      {/* Nom AMO */}
                      <td>
                        {user.amoValidation?.amo.nom ? (
                          <span className={`fr-badge fr-badge--sm`}>{user.amoValidation.amo.nom}</span>
                        ) : (
                          <span> - </span>
                        )}
                      </td>

                      {/* Statut AMO */}
                      <td>
                        {user.amoValidation ? (
                          <span
                            className={`fr-badge fr-badge--sm ${STATUT_AMO_BADGE_CLASSES[user.amoValidation.statut]}`}>
                            {STATUT_AMO_LABELS[user.amoValidation.statut]}
                          </span>
                        ) : (
                          <span className="fr-badge fr-badge--sm fr-badge--new">Non demandé</span>
                        )}
                      </td>

                      {/* Lien validation AMO */}
                      <td>
                        {user.amoValidation?.token ? (
                          <div className="fr-grid-row fr-grid-row--gutters">
                            <div className="fr-col-12">
                              <a
                                href={getValidationUrl(user.amoValidation.token.token)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="fr-link fr-text--sm"
                                title="Ouvrir le lien de validation">
                                Voir le lien
                              </a>
                            </div>
                            <div className="fr-col-12">
                              <span
                                className={`fr-badge fr-badge--sm ${
                                  getTokenStatus(user.amoValidation.token).badgeClass
                                }`}>
                                {getTokenStatus(user.amoValidation.token).label}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="fr-badge fr-badge--sm fr-badge--new">Non généré</span>
                        )}
                      </td>
                    </tr>

                    {/* Ligne détail dépliable  */}
                    {expandedUserId === user.user.id && (
                      <tr>
                        <td colSpan={9}>
                          <div className="fr-p-4w" style={{ backgroundColor: "#f6f6f6" }}>
                            {expandedUserId === user.user.id && <UserDetailRow user={user} />}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
