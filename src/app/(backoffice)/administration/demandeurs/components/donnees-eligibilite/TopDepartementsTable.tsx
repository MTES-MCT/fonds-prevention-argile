"use client";

import type { EligibiliteStats } from "@/features/backoffice/administration/tableau-de-bord/domain/types/eligibilite-stats.types";

interface TopDepartementsTableProps {
  stats: EligibiliteStats | null;
  loading: boolean;
}

export function TopDepartementsTable({ stats, loading }: TopDepartementsTableProps) {
  if (loading) {
    return (
      <div
        className="fr-p-3w"
        style={{
          backgroundColor: "var(--background-default-grey)",
          border: "1px solid var(--border-default-grey)",
        }}>
        <p className="fr-text--lg fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
          Chargement...
        </p>
      </div>
    );
  }

  const departements = stats?.topDepartements ?? [];

  return (
    <div
      style={{
        backgroundColor: "var(--background-default-grey)",
        border: "1px solid var(--border-default-grey)",
      }}>
      <div className="fr-px-2w fr-pt-2w">
        <h3 className="fr-h6 fr-mb-0">Top 5 simulations par département</h3>
      </div>
      <div className="fr-table fr-mb-0 fr-px-4v fr-pb-2w">
        <div className="fr-table__wrapper" style={{ overflow: "hidden" }}>
          <div className="fr-table__container" style={{ overflow: "hidden" }}>
            <div className="fr-table__content">
              <table>
                <caption className="sr-only">Top 5 départements par simulations</caption>
                <thead>
                  <tr>
                    <th scope="col">Départements</th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      Simulations
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {departements.length === 0 && (
                    <tr>
                      <td colSpan={2} className="fr-text--sm" style={{ color: "var(--text-mention-grey)" }}>
                        Aucune donnée disponible
                      </td>
                    </tr>
                  )}
                  {departements.map((dept) => (
                    <tr key={dept.codeDepartement}>
                      <td className="fr-text--sm">
                        {dept.codeDepartement} {dept.nomDepartement}
                      </td>
                      <td className="fr-text--sm" style={{ textAlign: "right" }}>
                        {dept.simulations.toLocaleString("fr-FR")}
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
