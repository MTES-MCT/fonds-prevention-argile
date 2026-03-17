"use client";

interface TopSimulationsRow {
  label: string;
  simulations: number;
}

interface TopSimulationsCardProps {
  title: string;
  columnLabel: string;
  rows: TopSimulationsRow[];
  loading: boolean;
}

/**
 * Carte generique "Top 5 simulations par X" — utilisee pour departements et communes.
 */
export default function TopSimulationsCard({ title, columnLabel, rows, loading }: TopSimulationsCardProps) {
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

  if (rows.length === 0) {
    return (
      <div
        className="fr-p-3w"
        style={{
          backgroundColor: "var(--background-default-grey)",
          border: "1px solid var(--border-default-grey)",
        }}>
        <h2 className="fr-text--lg fr-mb-0" style={{ fontWeight: 700 }}>
          {title}
        </h2>
        <p className="fr-mt-2w fr-text--sm" style={{ color: "var(--text-mention-grey)" }}>
          Aucune donnee disponible.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "var(--background-default-grey)",
        border: "1px solid var(--border-default-grey)",
      }}>
      {/* Header */}
      <div className="fr-px-2w fr-pt-2w">
        <h2 className="fr-text--lg fr-mb-0" style={{ fontWeight: 700 }}>
          {title}
        </h2>
      </div>

      {/* Tableau DSFR */}
      <div className="fr-table fr-mb-0 fr-px-4v fr-mb-4w">
        <div className="fr-table__wrapper" style={{ overflow: "hidden" }}>
          <div className="fr-table__container" style={{ overflow: "hidden" }}>
            <div className="fr-table__content">
              <table>
                <caption className="sr-only">{title}</caption>
                <thead>
                  <tr>
                    <th scope="col">{columnLabel}</th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      Simulations
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label}>
                      <td className="fr-text--sm">{row.label}</td>
                      <td className="fr-text--sm" style={{ textAlign: "right" }}>
                        {row.simulations.toLocaleString("fr-FR")}
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
