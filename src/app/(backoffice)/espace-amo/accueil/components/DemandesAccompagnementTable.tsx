"use client";

import Link from "next/link";
import type { DemandeAccompagnement } from "@/features/backoffice/espace-amo/accueil/domain/types";
import { ROUTES } from "@/features/auth/domain/value-objects";
import { formatDate, formatNomComplet, formatCommune } from "@/shared/utils";

interface DemandesAccompagnementTableProps {
  demandes: DemandeAccompagnement[];
}

/**
 * Tableau des demandes d'accompagnement à traiter
 */
export function DemandesAccompagnementTable({ demandes }: DemandesAccompagnementTableProps) {
  return (
    <div className="fr-table fr-table--bordered">
      <div className="fr-table__wrapper">
        <div className="fr-table__container">
          <div className="fr-table__content">
            <table>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="fr-icon-user-fill fr-icon--sm fr-mr-2v" aria-hidden="true"></span>
                    Demandeurs
                  </th>
                  <th scope="col">
                    <span className="fr-icon-map-pin-2-fill fr-icon--sm fr-mr-2v" aria-hidden="true"></span>
                    Commune (CP)
                  </th>
                  <th scope="col">
                    <span className="fr-icon-calendar-fill fr-icon--sm fr-mr-2v" aria-hidden="true"></span>
                    Demande
                  </th>
                  <th scope="col">
                    <span className="fr-icon-settings-5-fill fr-icon--sm fr-mr-2v" aria-hidden="true"></span>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {demandes.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "var(--text-mention-grey)" }}>
                      Aucune demande en attente
                    </td>
                  </tr>
                ) : (
                  demandes.map((demande) => (
                    <tr key={demande.id}>
                      <td>
                        <Link href={ROUTES.backoffice.espaceAmo.demande(demande.id)} className="fr-link">
                          {formatNomComplet(demande.prenom, demande.nom)}
                        </Link>
                      </td>
                      <td>{formatCommune(demande.commune, demande.codePostal)}</td>
                      <td>{formatDate(demande.dateCreation.toISOString())}</td>
                      <td>
                        <Link
                          href={ROUTES.backoffice.espaceAmo.demande(demande.id)}
                          className="fr-btn fr-btn--sm fr-btn--icon-right fr-icon-arrow-right-line">
                          Traiter
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
