"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DossierSuivi } from "@/features/backoffice/espace-agent/dossiers/domain/types";
import {
  STEP_LABELS,
  getPrecisionText,
  getPrecisionStyle,
} from "@/features/backoffice/espace-agent/dossiers/domain/types";
import { ROUTES } from "@/features/auth/domain/value-objects";
import { formatNomComplet, formatDaysAgoSplit } from "@/shared/utils";
import { ActionMenu } from "../../shared/components/ActionMenu";

interface DossiersSuivisTableProps {
  dossiers: DossierSuivi[];
  /** Indique si les dossiers affichés sont archivés (change la couleur de la cellule Précisions) */
  isArchived?: boolean;
}

/**
 * Tableau des dossiers suivis
 */
export function DossiersSuivisTable({ dossiers, isArchived = false }: DossiersSuivisTableProps) {
  const router = useRouter();

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
                    <span className="fr-icon-flashlight-fill fr-icon--sm fr-mr-2v" aria-hidden="true"></span>
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
                    const greyStyle = isArchived ? { color: "var(--text-mention-grey)" } : undefined;
                    return (
                      <tr key={dossier.id}>
                        <td>
                          <Link href={ROUTES.backoffice.espaceAmo.dossier(dossier.id)} className="fr-link">
                            {formatNomComplet(dossier.prenom, dossier.nom)}
                          </Link>
                        </td>
                        <td style={greyStyle}>{dossier.commune}</td>
                        <td>
                          <p className={isArchived ? "fr-tag" : "fr-tag fr-tag--blue-cumulus"}>
                            {STEP_LABELS[dossier.etape]}
                          </p>
                        </td>
                        <td
                          style={{
                            maxWidth: "350px",
                            wordWrap: "break-word",
                            whiteSpace: "normal",
                            ...getPrecisionStyle(dossier.statut, isArchived),
                            ...greyStyle,
                          }}>
                          <div>{getPrecisionText(dossier.etape, dossier.statut, dossier.dsStatus)}</div>
                          {daysAgo && (
                            <div className="fr-text--xs fr-text-mention--grey">
                              {daysAgo.text} (le {daysAgo.date})
                            </div>
                          )}
                        </td>
                        <td>
                          <ActionMenu
                            items={[
                              {
                                label: "Voir sa simulation d'éligibilité",
                                icon: "fr-icon-eye-line",
                                onClick: () =>
                                  router.push(ROUTES.backoffice.espaceAmo.editionDonneesSimulation(dossier.id)),
                              },
                              isArchived
                                ? {
                                    label: "Désarchiver",
                                    icon: "fr-icon-inbox-archive-line",
                                    onClick: () => console.log("TODO: désarchiver dossier", dossier.id),
                                  }
                                : {
                                    label: "Archiver",
                                    icon: "fr-icon-archive-line",
                                    onClick: () => console.log("TODO: archiver dossier", dossier.id),
                                  },
                            ]}
                          />
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
