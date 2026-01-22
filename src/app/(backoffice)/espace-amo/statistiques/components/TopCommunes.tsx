"use client";

// TODO: Ajouter les types et props une fois les données disponibles
// interface TopCommunesProps {
//   communes: {
//     nom: string;
//     codePostal: string;
//     nombreDemandeurs: number;
//   }[];
// }

/**
 * Composant affichant le top 5 des communes avec le plus de demandeurs
 * sous forme de tableau
 */
export function TopCommunes() {
  // TODO: Implémenter avec les vraies données
  return (
    <div className="fr-mb-6w">
      <h2 className="fr-h4 fr-mb-1w">Top 5 des communes</h2>
      <p className="fr-text-mention--grey fr-mb-3w">Nombre de demandeurs par département</p>

      <div className="fr-table">
        <table>
          <thead>
            <tr>
              <th scope="col">Commune (CP)</th>
              <th scope="col">Nombre de demandeurs</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={2} style={{ textAlign: "center", color: "var(--text-mention-grey)" }}>
                Données non disponibles
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
