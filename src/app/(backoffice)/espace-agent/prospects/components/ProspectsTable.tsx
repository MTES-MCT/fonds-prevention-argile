"use client";

import { useState } from "react";
import Link from "next/link";
import type { Prospect } from "../../../../../features/backoffice/espace-agent/prospects/domain/types";
import { formatNomComplet, formatDaysAgoSplit } from "@/shared/utils";
import { ROUTES } from "@/features/auth/domain/value-objects";
import { ActionMenu } from "../../shared/components/ActionMenu";
import { ArchiveModal } from "../../shared/components/ArchiveModal";
import { UnarchiveModal } from "../../shared/components/UnarchiveModal";
import {
  archiveProspectAction,
  unarchiveProspectAction,
} from "@/features/backoffice/espace-agent/prospects/actions/archive-prospect.actions";

type ProspectsTableVariant = "prospect" | "eligible" | "archive";

interface ProspectsTableProps {
  prospects: Prospect[];
  variant: ProspectsTableVariant;
  /** Callback pour recharger les données après archivage/désarchivage */
  onRefresh?: () => void;
}

/**
 * Tableau des prospects avec ActionMenu contextuel selon la variante
 */
export function ProspectsTable({ prospects, variant, onRefresh }: ProspectsTableProps) {
  const [archiveParcoursId, setArchiveParcoursId] = useState<string | null>(null);
  const [unarchiveParcoursId, setUnarchiveParcoursId] = useState<string | null>(null);

  const isArchived = variant === "archive";

  function handleArchiveSuccess() {
    setArchiveParcoursId(null);
    onRefresh?.();
  }

  function handleUnarchiveSuccess() {
    setUnarchiveParcoursId(null);
    onRefresh?.();
  }

  function getActionMenuItems(prospect: Prospect) {
    const firstItem =
      variant === "eligible"
        ? {
            label: "Voir sa simulation d\u2019\u00e9ligibilit\u00e9",
            icon: "fr-icon-eye-line",
            onClick: () => {
              window.location.href = ROUTES.backoffice.espaceAgent.editionDonneesSimulation(
                prospect.parcoursId,
              );
            },
          }
        : {
            label: "Voir d\u00e9tails",
            icon: "fr-icon-eye-line",
            onClick: () => {
              window.location.href = ROUTES.backoffice.espaceAgent.prospect(prospect.parcoursId);
            },
          };

    const items = [firstItem];

    if (variant === "archive") {
      items.push({
        label: "D\u00e9sarchiver",
        icon: "fr-icon-inbox-archive-line",
        onClick: () => setUnarchiveParcoursId(prospect.parcoursId),
      });
    } else {
      items.push({
        label: "Archiver",
        icon: "fr-icon-archive-line",
        onClick: () => setArchiveParcoursId(prospect.parcoursId),
      });
    }

    return items;
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
                    <th scope="col">
                      <span className="fr-icon-user-fill fr-icon--sm fr-mr-2v" aria-hidden="true"></span>
                      Demandeur
                    </th>
                    <th scope="col">
                      <span className="fr-icon-map-pin-2-fill fr-icon--sm fr-mr-2v" aria-hidden="true"></span>
                      Commune
                    </th>
                    <th scope="col">
                      <span className="fr-icon-calendar-line fr-icon--sm fr-mr-2v" aria-hidden="true"></span>
                      Demande
                    </th>
                    <th scope="col">
                      <span className="fr-icon-flashlight-fill fr-icon--sm fr-mr-2v" aria-hidden="true"></span>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {prospects.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", color: "var(--text-mention-grey)" }}>
                        {variant === "prospect" && "Aucun prospect trouvé dans votre territoire"}
                        {variant === "eligible" && "Aucun prospect éligible"}
                        {variant === "archive" && "Aucun prospect archivé"}
                      </td>
                    </tr>
                  ) : (
                    prospects.map((prospect) => {
                      const daysAgo = formatDaysAgoSplit(prospect.updatedAt.toISOString());
                      const greyStyle = isArchived ? { color: "var(--text-mention-grey)" } : undefined;
                      return (
                        <tr key={prospect.parcoursId}>
                          <td>
                            <Link
                              href={ROUTES.backoffice.espaceAgent.prospect(prospect.parcoursId)}
                              className="fr-link">
                              {formatNomComplet(prospect.particulier.prenom, prospect.particulier.nom)}
                            </Link>
                          </td>
                          <td style={greyStyle}>{prospect.logement.commune}</td>
                          <td style={greyStyle}>
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
                            {variant === "prospect" ? (
                              <Link
                                href={ROUTES.backoffice.espaceAgent.prospect(prospect.parcoursId)}
                                className="fr-btn fr-btn--sm fr-btn--icon-right fr-icon-arrow-right-line">
                                Qualifier
                              </Link>
                            ) : (
                              <ActionMenu items={getActionMenuItems(prospect)} />
                            )}
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
        archiveAction={archiveProspectAction}
        entityLabel="prospect"
      />

      {/* Modale de désarchivage (toujours montée pour que le DSFR l'initialise) */}
      <UnarchiveModal
        isOpen={!!unarchiveParcoursId}
        onClose={() => setUnarchiveParcoursId(null)}
        parcoursId={unarchiveParcoursId ?? ""}
        onSuccess={handleUnarchiveSuccess}
        unarchiveAction={unarchiveProspectAction}
        entityLabel="prospect"
      />
    </>
  );
}
