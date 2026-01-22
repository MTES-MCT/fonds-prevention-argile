"use client";

// TODO: Ajouter les types et props une fois les données disponibles
// interface RepartitionParRevenuProps {
//   repartition: {
//     tresModeste: number;
//     modeste: number;
//     intermediaire: number;
//   };
// }

/**
 * Composant affichant la répartition des dossiers par catégorie de revenus
 * avec 3 cartes : Très modeste, Modeste, Intermédiaire
 *
 * Note: Les ménages dans la catégorie "supérieure" sont exclus du dispositif
 */
export function RepartitionParRevenu() {
  // TODO: Implémenter avec les vraies données
  return (
    <div className="fr-mb-6w">
      <h2 className="fr-h4 fr-mb-1w">Répartition par revenus</h2>
      <p className="fr-text-mention--grey fr-mb-3w">
        Les ménages dans la catégorie &quot;supérieure&quot; sont exclus du dispositif
      </p>

      <div className="fr-grid-row fr-grid-row--gutters">
        {/* Carte Très modeste */}
        <div className="fr-col-12 fr-col-md-4">
          <div
            className="fr-p-3w"
            style={{
              backgroundColor: "var(--background-default-grey)",
              borderRadius: "8px",
              textAlign: "center",
            }}>
            <p
              className="fr-mb-1v"
              style={{
                fontSize: "2.5rem",
                fontWeight: "700",
                lineHeight: "1.2",
                color: "var(--text-action-high-blue-france)",
              }}>
              -
            </p>
            <p
              className="fr-text--sm fr-mb-0"
              style={{
                color: "var(--text-action-high-blue-france)",
                fontWeight: "500",
                textTransform: "uppercase",
              }}>
              Très modeste
            </p>
          </div>
        </div>

        {/* Carte Modeste */}
        <div className="fr-col-12 fr-col-md-4">
          <div
            className="fr-p-3w"
            style={{
              backgroundColor: "var(--background-default-grey)",
              borderRadius: "8px",
              textAlign: "center",
            }}>
            <p
              className="fr-mb-1v"
              style={{
                fontSize: "2.5rem",
                fontWeight: "700",
                lineHeight: "1.2",
                color: "var(--text-action-high-blue-france)",
              }}>
              -
            </p>
            <p
              className="fr-text--sm fr-mb-0"
              style={{
                color: "var(--text-action-high-blue-france)",
                fontWeight: "500",
                textTransform: "uppercase",
              }}>
              Modeste
            </p>
          </div>
        </div>

        {/* Carte Intermédiaire */}
        <div className="fr-col-12 fr-col-md-4">
          <div
            className="fr-p-3w"
            style={{
              backgroundColor: "var(--background-default-grey)",
              borderRadius: "8px",
              textAlign: "center",
            }}>
            <p
              className="fr-mb-1v"
              style={{
                fontSize: "2.5rem",
                fontWeight: "700",
                lineHeight: "1.2",
                color: "var(--text-action-high-blue-france)",
              }}>
              -
            </p>
            <p
              className="fr-text--sm fr-mb-0"
              style={{
                color: "var(--text-action-high-blue-france)",
                fontWeight: "500",
                textTransform: "uppercase",
              }}>
              Intermédiaire
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
