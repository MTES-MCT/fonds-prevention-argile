import Link from "next/link";

interface CatnatSummaryProps {
  totalCatnat: number;
  nomTerritoire: string;
  typeTerritoire: "département" | "epci";
  codeTerritoire?: string;
}

/**
 * Composant pour afficher le résumé des catastrophes naturelles d'un territoire
 */
export function CatnatSummary({ totalCatnat, nomTerritoire, typeTerritoire, codeTerritoire }: CatnatSummaryProps) {
  // Ne rien afficher s'il n'y a pas de catastrophes
  if (totalCatnat === 0) {
    return null;
  }

  // Adapter le libellé selon le type de territoire
  const libelleZone = typeTerritoire === "département" ? `l'ensemble du département` : `l'ensemble du territoire`;

  // Construire le titre avec ou sans code
  const titreComplet =
    typeTerritoire === "département" && codeTerritoire
      ? `Historique des catastrophes naturelles dans le ${nomTerritoire} (${codeTerritoire})`
      : `Historique des catastrophes naturelles dans ${nomTerritoire}`;

  return (
    <section className="fr-py-4w">
      <div className="fr-container">
        <h2 className="fr-h3 fr-mb-3w">{titreComplet}</h2>

        <div className="fr-callout fr-callout--brown-caramel fr-icon-warning-line">
          <p className="fr-callout__title">
            {totalCatnat} épisode{totalCatnat > 1 ? "s" : ""} de sécheresse classé{totalCatnat > 1 ? "s" : ""}{" "}
            catastrophe naturelle
          </p>
        </div>

        <div className="fr-mt-3w">
          <p className="fr-text--sm">
            Depuis plus de 10 ans, les épisodes de sécheresse intense se multiplient, entraînant des mouvements répétés
            des sols argileux. Même si votre logement n'a pas encore été touché par le RGA, le risque sur votre
            territoire augmente de jour en jour.
          </p>
          <p className="fr-text--sm">Intervenez avant que les dommages ne soient trop important.</p>
          <Link
            href="https://www.georisques.gouv.fr/risques/retrait-gonflement-des-argiles"
            target="_blank"
            rel="noopener noreferrer"
            className="fr-link fr-link--icon-right fr-icon-external-link-line">
            Plus d'informations sur Géorisques
          </Link>
        </div>
      </div>
    </section>
  );
}
