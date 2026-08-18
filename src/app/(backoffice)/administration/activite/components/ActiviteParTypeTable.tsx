"use client";

import { VariationBadge } from "@/app/(backoffice)/administration/tableau-de-bord/shared/VariationBadge";
import type { ActionTypeStat } from "@/features/backoffice/administration/activite/domain/types/activite.types";

interface ActiviteParTypeTableProps {
  rows: ActionTypeStat[];
  loading: boolean;
}

export function ActiviteParTypeTable({ rows, loading }: ActiviteParTypeTableProps) {
  return (
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
                <caption className="sr-only">Nombre d&apos;actions par type</caption>
                <thead>
                  <tr>
                    <th scope="col">Type d&apos;action</th>
                    <th scope="col" style={{ textAlign: "right", whiteSpace: "nowrap", width: "10rem" }}>
                      Nombre
                    </th>
                    <th scope="col" style={{ textAlign: "right", whiteSpace: "nowrap", width: "6rem" }}>
                      Évolution
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={3} className="fr-text--sm">
                        Chargement...
                      </td>
                    </tr>
                  )}
                  {!loading && rows.length === 0 && (
                    <tr>
                      <td colSpan={3} className="fr-text--sm">
                        Aucune action enregistrée sur cette période.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    rows.map((row) => (
                      <tr key={row.actionType}>
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
  );
}
