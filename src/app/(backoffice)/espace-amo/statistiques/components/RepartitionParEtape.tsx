"use client";

import type { RepartitionParEtape as RepartitionParEtapeType } from "@/features/backoffice/espace-amo/statistiques/domain/types";

interface RepartitionParEtapeProps {
  repartition: RepartitionParEtapeType[];
}

/**
 * Composant affichant la répartition des dossiers par étape du parcours
 * avec une barre de progression colorée
 */
export function RepartitionParEtape({ repartition }: RepartitionParEtapeProps) {
  // Couleurs des étapes (du vert clair au vert foncé)
  const colors = [
    "#BAFAEE", // Choix AMO
    "#8BF8E7", // Éligibilité
    "#79E7D5", // Diagnostic
    "#5BB5A7", // Devis
    "#009081", // Factures
  ];

  return (
    <div className="fr-mb-6w">
      <h2 className="fr-h4 fr-mb-1w">Répartition par étape</h2>
      <p className="fr-text-mention--grey fr-mb-3w">Nombre de dossiers actuellement à chaque étape du parcours.</p>

      {/* Carte blanche contenant les étapes */}
      <div
        className="fr-p-3w"
        style={{
          backgroundColor: "var(--background-default-grey)",
          borderRadius: "8px",
        }}>
        {/* Étapes avec barre colorée au-dessus de chaque colonne */}
        <div className="fr-grid-row fr-grid-row--gutters">
          {repartition.map((etape, index) => (
            <div key={etape.etape} className="fr-col">
              {/* Barre colorée */}
              <div
                style={{
                  height: "8px",
                  backgroundColor: colors[index] || colors[0],
                  marginBottom: "12px",
                }}
              />
              <div style={{ textAlign: "left" }}>
                <p
                  className="fr-mb-1v"
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    lineHeight: "1.2",
                  }}>
                  {etape.count.toLocaleString("fr-FR")}
                </p>
                <p className="fr-text--sm fr-text-mention--grey fr-mb-0">{etape.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
