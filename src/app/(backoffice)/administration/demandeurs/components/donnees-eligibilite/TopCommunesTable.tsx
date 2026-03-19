"use client";

import type { EligibiliteStats } from "@/features/backoffice/administration/tableau-de-bord/domain/types/eligibilite-stats.types";

interface TopCommunesTableProps {
  stats: EligibiliteStats | null;
  loading: boolean;
}

export function TopCommunesTable({ stats, loading }: TopCommunesTableProps) {
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

  const communes = stats?.topCommunes ?? [];

  return (
    <div
      style={{
        backgroundColor: "var(--background-default-grey)",
        border: "1px solid var(--border-default-grey)",
      }}>
      <div className="fr-px-2w fr-pt-2w">
        <h3 className="fr-h6 fr-mb-0">Top 5 simulations par communes</h3>
      </div>
      <div className="fr-table fr-mb-0 fr-px-4v fr-pb-2w">
        <div className="fr-table__wrapper" style={{ overflow: "hidden" }}>
          <div className="fr-table__container" style={{ overflow: "hidden" }}>
            <div className="fr-table__content">
              <table>
                <caption className="sr-only">Top 5 communes par simulations</caption>
                <thead>
                  <tr>
                    <th scope="col">Communes</th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      Simulations
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {communes.length === 0 && (
                    <tr>
                      <td colSpan={2} className="fr-text--sm" style={{ color: "var(--text-mention-grey)" }}>
                        Aucune donnée disponible
                      </td>
                    </tr>
                  )}
                  {communes.map((commune) => (
                    <tr key={`${commune.commune}_${commune.codeDepartement}`}>
                      <td className="fr-text--sm">{commune.commune}</td>
                      <td className="fr-text--sm" style={{ textAlign: "right" }}>
                        {commune.simulations.toLocaleString("fr-FR")}
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
