"use client";

import { useMemo, useId } from "react";
import { VariationBadge } from "@/app/(backoffice)/administration/tableau-de-bord/shared/VariationBadge";
import { SourceAcquisition } from "@/shared/domain/value-objects/source-acquisition.enum";
import { filterUsersByDepartement } from "../filters/departements/departementFilter.utils";
import { PERIODES } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type { UserWithParcoursDetails } from "@/features/backoffice";
import type { PeriodeId } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

const SOURCE_LABELS_STATS: Record<SourceAcquisition, string> = {
  [SourceAcquisition.DDT]: "DDT (Direction Départementale des Territoires)",
  [SourceAcquisition.AMO]: "AMO (Assistant à Maîtrise d'Ouvrage)",
  [SourceAcquisition.ALLER_VERS]: "Aller-vers",
  [SourceAcquisition.ECFR]: "Un acteur local (ECFR)",
  [SourceAcquisition.FLYERS]: "Flyers",
  [SourceAcquisition.MEDIAS]: "Médias",
  [SourceAcquisition.BULLETIN_COMMUNAL]: "Bulletin de votre commune",
  [SourceAcquisition.PROS_BATIMENT_IMMOBILIER]: "Professionnels du bâtiment / immobilier",
  [SourceAcquisition.REUNION_PUBLIQUE_SALON]: "Réunion publique / salon",
  [SourceAcquisition.MOTEUR_RECHERCHE]: "Moteur de recherche",
  [SourceAcquisition.AUTRE]: "Autre",
};

interface SourcesAcquisitionTableProps {
  filteredUsers: UserWithParcoursDetails[];
  allUsers: UserWithParcoursDetails[];
  periodeId: PeriodeId;
  codeDepartement: string;
}

function computeVariation(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function SourcesAcquisitionTable({
  filteredUsers,
  allUsers,
  periodeId,
  codeDepartement,
}: SourcesAcquisitionTableProps) {
  const tooltipId = useId();

  const rows = useMemo(() => {
    const total = filteredUsers.length;

    const periode = PERIODES.find((p) => p.id === periodeId);
    const hasPreviousPeriod = periode !== undefined && periode.jours !== null;

    let previousUsers: UserWithParcoursDetails[] = [];
    if (hasPreviousPeriod && periode.jours !== null) {
      const now = new Date();
      const dateDebut = new Date(now.getTime() - periode.jours * 24 * 60 * 60 * 1000);
      const datePrevDebut = new Date(now.getTime() - 2 * periode.jours * 24 * 60 * 60 * 1000);

      let prev = allUsers.filter((u) => {
        const createdAt = u.parcours?.createdAt ?? u.user.createdAt;
        return createdAt >= datePrevDebut && createdAt < dateDebut;
      });

      if (codeDepartement) {
        prev = filterUsersByDepartement(prev, codeDepartement);
      }

      previousUsers = prev;
    }

    return Object.values(SourceAcquisition)
      .map((source) => {
        const currentCount = filteredUsers.filter((u) => u.user.sourceAcquisition === source).length;
        const previousCount = previousUsers.filter((u) => u.user.sourceAcquisition === source).length;
        const pourcentage = total > 0 ? Math.round((currentCount / total) * 100) : 0;
        const variation = hasPreviousPeriod ? computeVariation(currentCount, previousCount) : null;

        return {
          source,
          label: SOURCE_LABELS_STATS[source],
          count: currentCount,
          pourcentage,
          variation,
        };
      })
      .filter((row) => row.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [filteredUsers, allUsers, periodeId, codeDepartement]);

  if (filteredUsers.length === 0 || rows.length === 0) return null;

  return (
    <div>
      <h3 className="fr-h6 fr-mb-2w">
        Sources d&apos;acquisition{" "}
        <button aria-describedby={tooltipId} type="button" className="fr-btn--tooltip fr-btn">
          Information
        </button>
        <span className="fr-tooltip fr-placement" id={tooltipId} role="tooltip">
          Données base de données
        </span>
      </h3>
      <p className="fr-text--sm fr-text-mention--grey fr-mb-2w">Données disponibles pour les demandeurs inscrits après le 27 Avril 2026</p>
      <div
        style={{
          backgroundColor: "var(--background-default-grey)",
          border: "1px solid var(--border-default-grey)",
        }}>
        <div className="fr-table fr-mb-0 fr-px-4v fr-mb-4w">
          <div className="fr-table__wrapper" style={{ overflow: "hidden" }}>
            <div className="fr-table__container" style={{ overflow: "hidden" }}>
              <div className="fr-table__content">
                <table style={{ tableLayout: "fixed", width: "100%" }}>
                  <caption className="sr-only">Sources d&apos;acquisition des demandeurs</caption>
                  <thead>
                    <tr>
                      <th scope="col">Source</th>
                      <th scope="col" style={{ textAlign: "right", whiteSpace: "nowrap", width: "8rem" }}>
                        Nb rép.
                      </th>
                      <th scope="col" style={{ textAlign: "right", whiteSpace: "nowrap", width: "5rem" }}>
                        Var.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.source}>
                        <td
                          className="fr-text--sm"
                          title={row.label}
                          style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>
                          {row.label}
                        </td>
                        <td className="fr-text--sm" style={{ textAlign: "right" }}>
                          <strong>{row.count.toLocaleString("fr-FR")}</strong> ({row.pourcentage}%)
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <VariationBadge variation={row.variation} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
