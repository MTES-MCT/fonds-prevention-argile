"use client";

import Link from "next/link";
import type { Prospect } from "../domain/types";
import { formatNomComplet, formatCommune, formatDaysAgoSplit } from "@/shared/utils";
import { ROUTES } from "@/features/auth/domain/value-objects";

interface ProspectsTableProps {
  prospects: Prospect[];
}

const STEP_LABELS: Record<string, string> = {
  choix_amo: "Choix AMO",
  eligibilite: "Éligibilité",
  diagnostic: "Diagnostic",
  devis: "Devis",
  factures: "Factures",
};

/**
 * Tableau des prospects (particuliers sans AMO)
 */
export function ProspectsTable({ prospects }: ProspectsTableProps) {
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
                    Particulier
                  </th>
                  <th scope="col">
                    <span className="fr-icon-map-pin-2-fill fr-icon--sm fr-mr-2v" aria-hidden="true"></span>
                    Commune (CP)
                  </th>
                  <th scope="col">
                    <span className="fr-icon-list-ordered fr-icon--sm fr-mr-2v" aria-hidden="true"></span>
                    Étape actuelle
                  </th>
                  <th scope="col">
                    <span className="fr-icon-calendar-fill fr-icon--sm fr-mr-2v" aria-hidden="true"></span>
                    Dernière action
                  </th>
                  <th scope="col">
                    <span className="fr-icon-settings-5-fill fr-icon--sm fr-mr-2v" aria-hidden="true"></span>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {prospects.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--text-mention-grey)" }}>
                      Aucun prospect trouvé dans votre territoire
                    </td>
                  </tr>
                ) : (
                  prospects.map((prospect) => {
                    const daysAgo = formatDaysAgoSplit(prospect.updatedAt.toISOString());
                    return (
                      <tr key={prospect.parcoursId}>
                        <td>
                          <Link href={ROUTES.backoffice.espaceAgent.prospect(prospect.parcoursId)} className="fr-link">
                            {formatNomComplet(prospect.particulier.prenom, prospect.particulier.nom)}
                          </Link>
                        </td>
                        <td>{formatCommune(prospect.logement.commune, prospect.logement.codePostal)}</td>
                        <td>
                          <a href="#" className="fr-tag">
                            {STEP_LABELS[prospect.currentStep] || prospect.currentStep}
                          </a>
                        </td>
                        <td>
                          {daysAgo ? (
                            <>
                              <div>{daysAgo.text}</div>
                              <div className="fr-text--xs fr-text-mention--grey">Le {daysAgo.date}</div>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <Link
                            href={ROUTES.backoffice.espaceAgent.prospect(prospect.parcoursId)}
                            className="fr-btn fr-btn--sm fr-btn--secondary fr-btn--icon-right fr-icon-eye-line">
                            Voir détails
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
