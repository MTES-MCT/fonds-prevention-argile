interface CatnatSummaryDepartementProps {
  totalCatnat: number;
  nomDepartement: string;
  codeDepartement: string;
}

/**
 * Composant pour afficher le résumé des catastrophes naturelles d'un département
 */
export function CatnatSummaryDepartement({
  totalCatnat,
  nomDepartement,
  codeDepartement,
}: CatnatSummaryDepartementProps) {
  // Ne rien afficher s'il n'y a pas de catastrophes
  if (totalCatnat === 0) {
    return null;
  }

  return (
    <section className="fr-py-4w" style={{ backgroundColor: "#f6f6f6" }}>
      <div className="fr-container">
        <div className="fr-callout">
          <h3 className="fr-callout__title">
            Catastrophes naturelles en {nomDepartement} ({codeDepartement})
          </h3>
          <p className="fr-callout__text">
            Le département {nomDepartement} a connu{" "}
            <strong>
              {totalCatnat.toLocaleString("fr-FR")} reconnaissance{totalCatnat > 1 ? "s" : ""} de catastrophe naturelle
            </strong>{" "}
            au cours des 20 dernières années. Ces événements, principalement liés aux sécheresses et aux inondations,
            témoignent de la vulnérabilité du territoire face aux risques naturels.
          </p>
          <p className="fr-callout__text fr-mb-0">
            Le Fonds Prévention Argile vous accompagne pour protéger votre logement contre les risques liés au
            retrait-gonflement des argiles.
          </p>
        </div>
      </div>
    </section>
  );
}