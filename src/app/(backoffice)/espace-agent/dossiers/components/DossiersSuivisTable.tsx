"use client";

import Link from "next/link";
import type { DossierSuivi } from "@/features/backoffice/espace-agent/dossiers/domain/types";
import { STEP_LABELS, getPrecisionText } from "@/features/backoffice/espace-agent/dossiers/domain/types";
import { ROUTES } from "@/features/auth/domain/value-objects";
import { formatNomComplet, formatCommune, formatDaysAgoSplit } from "@/shared/utils";

interface DossiersSuivisTableProps {
  dossiers: DossierSuivi[];
}

/**
 * Tableau des dossiers suivis
 */
export function DossiersSuivisTable({ dossiers }: DossiersSuivisTableProps) {
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
                    Commune
                  </th>
                  <th scope="col">
                    <span className="fr-icon-list-ordered fr-icon--sm fr-mr-2v" aria-hidden="true"></span>
                    Étape
                  </th>
                  <th scope="col">
                    <span className="fr-icon-info-fill fr-icon--sm fr-mr-2v" aria-hidden="true"></span>
                    Précisions
                  </th>
                  <th scope="col">
                    <span className="fr-icon-info-fill fr-icon--sm fr-mr-2v" aria-hidden="true"></span>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {dossiers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--text-mention-grey)" }}>
                      Aucun dossier suivi
                    </td>
                  </tr>
                ) : (
                  dossiers.map((dossier) => {
                    const daysAgo = formatDaysAgoSplit(dossier.dateDernierStatut.toISOString());
                    return (
                      <tr key={dossier.id}>
                        <td>
                          <Link href={ROUTES.backoffice.espaceAmo.dossier(dossier.id)} className="fr-link">
                            {formatNomComplet(dossier.prenom, dossier.nom)}
                          </Link>
                        </td>
                        <td>{dossier.commune}</td>
                        <td>
                          <a href="#" className="fr-tag">
                            {STEP_LABELS[dossier.etape]}
                          </a>
                        </td>
                        <td style={{ maxWidth: "350px", wordWrap: "break-word", whiteSpace: "normal" }}>
                          <div>{getPrecisionText(dossier.etape, dossier.statut, dossier.dsStatus)}</div>
                          {daysAgo && (
                            <div className="fr-text--xs fr-text-mention--grey">
                              {daysAgo.text} (le {daysAgo.date})
                            </div>
                          )}
                        </td>
                        <td>
                          <Link
                            href={ROUTES.backoffice.espaceAmo.dossier(dossier.id)}
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
