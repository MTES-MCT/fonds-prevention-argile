"use client";

import React, { useState } from "react";
import { formatDate } from "@/shared/utils/date.utils";
import { UserDetailRow } from "./UserDetailRow";
import { UserWithParcoursDetails } from "@/features/backoffice";
import { UserParcoursCard } from "./UserDetailParcoursCard";

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
  // Source 1 : rgaSimulation (préféré, données structurées)
  const commune = user.rgaSimulation?.logement?.commune_nom;
  const departement = user.rgaSimulation?.logement?.code_departement;

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
                  <th scope="col">Commune (Dpt)</th>
                  <th scope="col">Date d'inscription</th>
                  <th scope="col">Parcours</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  return (
                    <React.Fragment key={user.user.id}>
                      <tr>
                        {/* Actions */}
                        <td>
                          <button
                            type="button"
                            className={`fr-btn fr-btn--sm fr-btn--secondary ${
                              expandedUserId === user.user.id ? "fr-icon-arrow-up-s-line" : "fr-icon-arrow-down-s-line"
                            } fr-btn--icon-left`}
                            onClick={() => toggleExpand(user.user.id)}
                            title={expandedUserId === user.user.id ? "Masquer les détails" : "Voir les détails"}>
                            {expandedUserId === user.user.id ? "Masquer" : "Voir détails"}
                          </button>
                        </td>

                        {/* Nom */}
                        <td>{getUserFullName(user)}</td>

                        {/* Commune */}
                        <td className="fr-text--sm">{getCommuneInfo(user)}</td>

                        {/* Date d'inscription */}
                        <td className="fr-text--sm">{formatDate(user.user.createdAt.toISOString())}</td>

                        {/* Parcours - Composant dédié */}
                        <td style={{ minWidth: "400px" }}>
                          <UserParcoursCard user={user} />
                        </td>
                      </tr>

                      {/* Ligne détail dépliable */}
                      {expandedUserId === user.user.id && (
                        <tr>
                          <td colSpan={5}>
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
