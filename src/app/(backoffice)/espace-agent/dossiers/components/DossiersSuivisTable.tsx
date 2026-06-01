"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DossierItem } from "@/features/backoffice/espace-agent/dossiers/domain/types";
import {
  getDossierStepLabel,
  getEtatBadge,
  getResponsableDisplayName,
  getDossierPrecisionLabel,
  getPrecisionStyle,
  STATUTS_REFUSES,
} from "@/features/backoffice/espace-agent/dossiers/domain";
import { ROUTES } from "@/features/auth/domain/value-objects";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { formatNomComplet, formatDaysAgoSplit, formatDate } from "@/shared/utils";
import { ActionMenu } from "../../shared/components/ActionMenu";
import { ArchiveModal } from "../../shared/components/ArchiveModal";
import { UnarchiveModal } from "../../shared/components/UnarchiveModal";
import { ColumnFilterButton, type FilterOption } from "./ColumnFilterButton";
import { ColumnSortButton } from "./ColumnSortButton";

interface DossiersSuivisTableProps {
  dossiers: DossierItem[];
  /** Indique si les dossiers affichés sont archivés (change la couleur de la cellule Précisions) */
  isArchived?: boolean;
  /** Callback pour recharger les données après archivage/désarchivage */
  onRefresh?: () => void;
  /** Sens du tri sur la colonne « Création ». */
  sortOrder?: "asc" | "desc";
  /** Inverse le sens du tri sur la colonne « Création ». */
  onToggleSort?: () => void;
  /** Options et état du filtre par colonne. */
  responsableOptions?: FilterOption[];
  etapeOptions?: FilterOption[];
  enAttenteOptions?: FilterOption[];
  responsableFilter?: Set<string>;
  etapeFilter?: Set<string>;
  enAttenteFilter?: Set<string>;
  onResponsableFilterChange?: (next: Set<string>) => void;
  onEtapeFilterChange?: (next: Set<string>) => void;
  onEnAttenteFilterChange?: (next: Set<string>) => void;
}

/**
 * Tableau des dossiers suivis
 */
export function DossiersSuivisTable({
  dossiers,
  isArchived = false,
  onRefresh,
  sortOrder = "desc",
  onToggleSort,
  responsableOptions = [],
  etapeOptions = [],
  enAttenteOptions = [],
  responsableFilter,
  etapeFilter,
  enAttenteFilter,
  onResponsableFilterChange,
  onEtapeFilterChange,
  onEnAttenteFilterChange,
}: DossiersSuivisTableProps) {
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
                    <th scope="col">
                      <span className="flex items-center justify-between gap-2">
                        Création
                        {onToggleSort && (
                          <ColumnSortButton order={sortOrder} onToggle={onToggleSort} criterion="création" />
                        )}
                      </span>
                    </th>
                    <th scope="col">Demandeurs</th>
                    <th scope="col">
                      <span className="flex items-center justify-between gap-2">
                        Responsable
                        {onResponsableFilterChange && responsableFilter && (
                          <ColumnFilterButton
                            ariaLabel="Filtrer par responsable"
                            options={responsableOptions}
                            selected={responsableFilter}
                            onChange={onResponsableFilterChange}
                          />
                        )}
                      </span>
                    </th>
                    <th scope="col">Commune</th>
                    <th scope="col">
                      <span className="flex items-center justify-between gap-2">
                        Étape
                        {onEtapeFilterChange && etapeFilter && (
                          <ColumnFilterButton
                            ariaLabel="Filtrer par étape"
                            options={etapeOptions}
                            selected={etapeFilter}
                            onChange={onEtapeFilterChange}
                          />
                        )}
                      </span>
                    </th>
                    <th scope="col">
                      <span className="flex items-center justify-between gap-2">
                        En attente de
                        {onEnAttenteFilterChange && enAttenteFilter && (
                          <ColumnFilterButton
                            ariaLabel="Filtrer par responsable courant"
                            options={enAttenteOptions}
                            selected={enAttenteFilter}
                            onChange={onEnAttenteFilterChange}
                          />
                        )}
                      </span>
                    </th>
                    <th scope="col" style={{ minWidth: "320px" }}>
                      Précisions
                    </th>
                    <th scope="col">Note complémentaire liée</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dossiers.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", color: "var(--text-mention-grey)" }}>
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
                      const badge = getEtatBadge(dossier.etat, dossier.logement.codeDepartement);
                      const precisionText = getDossierPrecisionLabel(
                        dossier.etat,
                        dossier.currentStep,
                        dossier.currentStatus,
                        dossier.dsStatus,
                        dossier.validation
                      );
                      const responsableLabel = getResponsableDisplayName(dossier.responsable);

                      // URL détail selon l'état ET le rôle de l'agent :
                      // - EN_ATTENTE + agent responsable (l'AMO destinataire) → page de
                      //   validation /demandes/[id] (callout + boutons accepter/refuser).
                      // - EN_ATTENTE mais agent NON responsable (AV / autre AMO du territoire)
                      //   → page de suivi /dossiers/[id] en consultation (l'accès /demandes
                      //   est réservé à l'AMO propriétaire, sinon 404).
                      // - validation traitée (éligible/refusée) → page de suivi /dossiers/[id].
                      // - pas de validation → page prospect (parcoursId).
                      const detailHref = dossier.validation
                        ? statutValidation === StatutValidationAmo.EN_ATTENTE && dossier.canActAsResponsable
                          ? ROUTES.backoffice.espaceAmo.demande(dossier.validation.id)
                          : ROUTES.backoffice.espaceAmo.dossier(dossier.validation.id)
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
                          <td style={greyStyle}>{formatDate(dossier.createdAt.toISOString())}</td>
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
                              minWidth: "320px",
                              maxWidth: "420px",
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
                          <td
                            style={{
                              maxWidth: "240px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              ...greyStyle,
                            }}
                            title={dossier.derniereNote ?? undefined}>
                            {dossier.derniereNote ?? <span style={{ color: "var(--text-mention-grey)" }}>—</span>}
                          </td>
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
