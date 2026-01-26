import type { InfoLogement as InfoLogementType } from "@/features/backoffice/espace-amo/demande/domain/types";

interface InfoLogementProps {
  logement: InfoLogementType;
}

/**
 * Composant affichant les informations sur le logement et l'éligibilité
 */
export function InfoLogement({ logement }: InfoLogementProps) {
  return (
    <div className="fr-card">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <div className="fr-mb-1w">
            <h3 className="fr-card__title fr-mb-1v">
              <span className="fr-icon-home-4-line fr-mr-2v" aria-hidden="true"></span>
              Logement & éligibilité
            </h3>
            <p className="fr-text--sm fr-text-mention--grey fr-mb-0 fr-ml-4w">
              Informations fournies en partie par le demandeur
            </p>
          </div>
          <ul className="fr-card__desc fr-ml-3w">
            {logement.anneeConstruction && (
              <li className="fr-mb-2v">
                Année de construction{" "}
                <span className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">
                  {logement.anneeConstruction}
                </span>
              </li>
            )}

            {logement.nombreNiveaux && (
              <li className="fr-mb-2v">
                Nombre de niveau{" "}
                <span className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">
                  {logement.nombreNiveaux} {Number(logement.nombreNiveaux) > 1 ? "NIVEAUX" : "NIVEAU"}
                </span>
              </li>
            )}

            {logement.etatMaison && (
              <li className="fr-mb-2v">
                État de la maison{" "}
                <span className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">
                  {logement.etatMaison.toUpperCase()}
                </span>
              </li>
            )}

            {logement.indemnisationPasseeRGA !== null && (
              <li className="fr-mb-2v">
                Indemnisation passée liée au RGA ?{" "}
                <span className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">
                  {logement.indemnisationPasseeRGA ? "OUI" : "NON"}
                </span>
              </li>
            )}

            {logement.nombreHabitants && (
              <li className="fr-mb-2v">
                Habitants du logement{" "}
                <span className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">
                  {logement.nombreHabitants} {logement.nombreHabitants > 1 ? "HABITANTS" : "HABITANT"}
                </span>
              </li>
            )}

            {logement.niveauRevenu && (
              <li className="fr-mb-2v">
                Revenus du foyer{" "}
                <span className="fr-badge fr-badge--sm fr-badge--yellow-tournesol fr-badge--no-icon">
                  {logement.niveauRevenu === "Très modeste"
                    ? "MÉNAGE TRÈS MODESTE"
                    : logement.niveauRevenu === "Modeste"
                      ? "MÉNAGE MODESTE"
                      : logement.niveauRevenu.toUpperCase()}
                </span>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
