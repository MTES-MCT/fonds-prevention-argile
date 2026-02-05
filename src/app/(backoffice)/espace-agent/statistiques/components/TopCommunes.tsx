"use client";

import type { CommuneStats } from "@/features/backoffice/espace-agent/statistiques/domain/types";

interface TopCommunesProps {
  communes: CommuneStats[];
}

/**
 * Composant affichant le top 5 des communes avec le plus de demandeurs
 * sous forme de tableau DSFR
 */
export function TopCommunes({ communes }: TopCommunesProps) {
  return (
    <div className="fr-mb-6w">
      <h2 className="fr-h4 fr-mb-1w">Top 5 des communes</h2>
      <p className="fr-text-mention--grey fr-mb-3w">Nombre de demandeurs suivis par commune</p>

      <div className="fr-table fr-table--bordered">
        <div className="fr-table__wrapper">
          <div className="fr-table__container">
            <div className="fr-table__content">
              <table>
                <thead>
                  <tr>
                    <th scope="col">
                      <span className="fr-icon-map-pin-2-fill fr-icon--sm fr-mr-2v" aria-hidden="true"></span>Commune
                      (CP)
                    </th>
                    <th scope="col">
                      <span className="fr-icon-user-fill fr-icon--sm fr-mr-2v" aria-hidden="true"></span>Nombre de
                      demandeurs
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {communes.length === 0 ? (
                    <tr>
                      <td colSpan={2} style={{ textAlign: "center", color: "var(--text-mention-grey)" }}>
                        Aucune donnée disponible
                      </td>
                    </tr>
                  ) : (
                    communes.map((commune, index) => (
                      <tr key={`${commune.commune}-${commune.codeDepartement}-${index}`}>
                        <td>
                          {commune.commune} ({commune.codeDepartement})
                        </td>
                        <td>{commune.nombreDemandeurs.toLocaleString("fr-FR")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
