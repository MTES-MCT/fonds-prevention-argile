"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DossierItem } from "@/features/backoffice/espace-agent/dossiers/domain/types";
import {
  getDossierStepLabel,
  getResponsableBadge,
  getResponsableDisplayName,
  getDossierPrecisionLabel,
  getPrecisionStyle,
  STATUTS_REFUSES,
} from "@/features/backoffice/espace-agent/dossiers/domain";
import { ROUTES } from "@/features/auth/domain/value-objects";
import { formatNomComplet, formatDaysAgoSplit, formatDate } from "@/shared/utils";
import { ActionMenu } from "../../shared/components/ActionMenu";
import { ArchiveModal } from "../../shared/components/ArchiveModal";
import { UnarchiveModal } from "../../shared/components/UnarchiveModal";

interface DossiersSuivisTableProps {
  dossiers: DossierItem[];
  /** Indique si les dossiers affichés sont archivés (change la couleur de la cellule Précisions) */
  isArchived?: boolean;
  /** Callback pour recharger les données après archivage/désarchivage */
  onRefresh?: () => void;
}

/**
 * Tableau des dossiers suivis
 */
export function DossiersSuivisTable({ dossiers, isArchived = false, onRefresh }: DossiersSuivisTableProps) {
  const router = useRouter();
  const [archiveParcoursId, setArchiveParcoursId] = useState<string | null>(null);
  const [unarchiveParcoursId, setUnarchiveParcoursId] = useState<string | null>(null);

  function handleArchiveSuccess() {
    setArchiveParcoursId(null);
    onRefresh?.();
  }

  function handleUnarchiveSuccess() {
    setUnarchiveParcoursId(null);
    onRefresh?.();
  }

  return (
    <>
      <div className="fr-table fr-table--bordered">
        <div className="fr-table__wrapper">
          <div className="fr-table__container">
            <div className="fr-table__content">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Demandeurs</th>
                    <th scope="col">Responsable</th>
                    <th scope="col">Commune</th>
                    <th scope="col">Étape</th>
                    <th scope="col">En attente de</th>
                    <th scope="col">Précisions</th>
                    <th scope="col">Ajout</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dossiers.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", color: "var(--text-mention-grey)" }}>
                        Aucun dossier
                      </td>
                    </tr>
                  ) : (
                    dossiers.map((dossier) => {
                      const daysAgo = formatDaysAgoSplit(dossier.updatedAt.toISOString());
                      const statutValidation = dossier.validation?.statut ?? null;
                      const isRefuse = statutValidation !== null && STATUTS_REFUSES.includes(statutValidation);
                      const greyStyle = isArchived ? { color: "var(--text-mention-grey)" } : undefined;

                      const etapeLabel = getDossierStepLabel(dossier.currentStep, dossier.validation);
                      const badge = getResponsableBadge(dossier.responsable);
                      const precisionText = getDossierPrecisionLabel(
                        dossier.responsable,
                        dossier.currentStep,
                        dossier.currentStatus,
                        dossier.dsStatus,
                        dossier.validation
                      );
                      const responsableLabel = getResponsableDisplayName(dossier.responsable);

                      // URL détail : page AMO (validationId) si validation existe, sinon page
                      // prospect (parcoursId). Sera unifié plus tard.
                      const detailHref = dossier.validation
                        ? ROUTES.backoffice.espaceAmo.dossier(dossier.validation.id)
                        : `/espace-agent/prospects/${dossier.parcoursId}`;

                      const actionItems = [
                        {
                          label: "Voir sa simulation d'éligibilité",
                          icon: "fr-icon-eye-line",
                          onClick: () =>
                            router.push(ROUTES.backoffice.espaceAmo.editionDonneesSimulation(dossier.parcoursId)),
                        },
                        // Archiver / Désarchiver : réservé au responsable courant.
                        ...(!isRefuse && dossier.canActAsResponsable
                          ? [
                              isArchived
                                ? {
                                    label: "Désarchiver",
                                    icon: "fr-icon-inbox-archive-line",
                                    onClick: () => setUnarchiveParcoursId(dossier.parcoursId),
                                  }
                                : {
                                    label: "Archiver",
                                    icon: "fr-icon-archive-line",
                                    onClick: () => setArchiveParcoursId(dossier.parcoursId),
                                  },
                            ]
                          : []),
                      ];

                      return (
                        <tr key={dossier.parcoursId}>
                          <td>
                            <Link href={detailHref} className="fr-link">
                              {formatNomComplet(dossier.particulier.prenom, dossier.particulier.nom)}
                            </Link>
                            {isRefuse && (
                              <p className="fr-badge fr-badge--sm fr-badge--error fr-badge--no-icon fr-ml-1w">Refusé</p>
                            )}
                          </td>
                          <td style={greyStyle}>{responsableLabel}</td>
                          <td style={greyStyle}>{dossier.logement.commune}</td>
                          <td>
                            <p className="fr-tag">{etapeLabel}</p>
                          </td>
                          <td>
                            <p className={`fr-badge fr-badge--sm fr-badge--no-icon ${badge.colorClass}`}>
                              {badge.label}
                            </p>
                          </td>
                          <td
                            style={{
                              maxWidth: "350px",
                              wordWrap: "break-word",
                              whiteSpace: "normal",
                              ...getPrecisionStyle(dossier.currentStatus, isArchived || isRefuse),
                              ...greyStyle,
                            }}>
                            <div>{precisionText}</div>
                            {daysAgo && (
                              <div className="fr-text--xs fr-text-mention--grey">
                                {daysAgo.text} (le {daysAgo.date})
                              </div>
                            )}
                          </td>
                          <td style={greyStyle}>{formatDate(dossier.createdAt.toISOString())}</td>
                          <td>
                            <ActionMenu items={actionItems} />
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

      {/* Modale d'archivage (toujours montée pour que le DSFR l'initialise) */}
      <ArchiveModal
        isOpen={!!archiveParcoursId}
        onClose={() => setArchiveParcoursId(null)}
        parcoursId={archiveParcoursId ?? ""}
        onSuccess={handleArchiveSuccess}
      />

      {/* Modale de désarchivage (toujours montée pour que le DSFR l'initialise) */}
      <UnarchiveModal
        isOpen={!!unarchiveParcoursId}
        onClose={() => setUnarchiveParcoursId(null)}
        parcoursId={unarchiveParcoursId ?? ""}
        onSuccess={handleUnarchiveSuccess}
      />
    </>
  );
}
