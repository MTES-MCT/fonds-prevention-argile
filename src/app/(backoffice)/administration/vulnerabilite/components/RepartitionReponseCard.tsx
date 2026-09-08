"use client";

import type { CritereReponsesStats } from "@/features/backoffice/administration/vulnerabilite/domain/types/vulnerabilite-stats.types";

interface RepartitionReponseCardProps {
  stats: CritereReponsesStats;
  loading: boolean;
}

/**
 * Carte "répartition des réponses" pour un critère de la grille de vulnérabilité —
 * une barre par réponse possible, triée par fréquence décroissante.
 */
export function RepartitionReponseCard({ stats, loading }: RepartitionReponseCardProps) {
  if (loading) {
    return (
      <div
        className="fr-p-3w"
        style={{
          backgroundColor: "var(--background-default-grey)",
          border: "1px solid var(--border-default-grey)",
          height: "100%",
        }}>
        <p className="fr-text--lg fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
          Chargement...
        </p>
      </div>
    );
  }

  return (
    <div
      className="fr-p-3w"
      style={{
        backgroundColor: "var(--background-default-grey)",
        border: "1px solid var(--border-default-grey)",
        height: "100%",
      }}>
      <h3 className="fr-text--md fr-mb-2w" style={{ fontWeight: 700 }}>
        {stats.label}
      </h3>
      {stats.reponses.length === 0 ? (
        <p className="fr-text--sm fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
          Aucune donnée disponible.
        </p>
      ) : (
        <ul className="fr-mb-0" style={{ listStyle: "none", padding: 0 }}>
          {stats.reponses.map((reponse) => (
            <li key={reponse.reponse} className="fr-mb-2w">
              <div className="fr-grid-row fr-grid-row--middle" style={{ justifyContent: "space-between" }}>
                <span className="fr-text--sm fr-mb-0">{reponse.label}</span>
                <span className="fr-text--sm fr-mb-0" style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                  {reponse.pourcentage} %{" "}
                  <span style={{ color: "var(--text-mention-grey)", fontWeight: 400 }}>
                    ({reponse.count.toLocaleString("fr-FR")})
                  </span>
                </span>
              </div>
              <div
                style={{
                  height: "0.5rem",
                  backgroundColor: "var(--background-contrast-grey)",
                  borderRadius: "0.25rem",
                  marginTop: "0.25rem",
                }}>
                <div
                  style={{
                    height: "100%",
                    width: `${reponse.pourcentage}%`,
                    backgroundColor: "var(--background-flat-blue-france)",
                    borderRadius: "0.25rem",
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
