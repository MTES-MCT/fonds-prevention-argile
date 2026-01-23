import type { InfoLogement as InfoLogementType } from "@/features/backoffice/espace-amo/demande/domain/types";

interface InfoLogementProps {
  logement: InfoLogementType;
}

/**
 * Composant affichant les informations sur le logement et l'éligibilité
 */
export function InfoLogement({ logement }: InfoLogementProps) {
  return (
    <div className="fr-card fr-card--no-border fr-card--shadow">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <h3 className="fr-card__title">
            <span className="fr-icon-home-4-fill fr-icon--sm fr-mr-2v" aria-hidden="true"></span>
            Logement & éligibilité
          </h3>
          <div className="fr-card__desc">
            <ul className="fr-raw-list">
              {logement.anneeConstruction && (
                <li className="fr-mb-2v">
                  <span className="fr-icon-calendar-fill fr-icon--sm fr-mr-1v" aria-hidden="true"></span>
                  <strong>Année de construction :</strong> {logement.anneeConstruction}
                </li>
              )}

              {logement.nombreNiveaux && (
                <li className="fr-mb-2v">
                  <span className="fr-icon-building-fill fr-icon--sm fr-mr-1v" aria-hidden="true"></span>
                  <strong>Nombre de niveaux :</strong> {logement.nombreNiveaux}
                </li>
              )}

              {logement.etatMaison && (
                <li className="fr-mb-2v">
                  <span className="fr-icon-tools-fill fr-icon--sm fr-mr-1v" aria-hidden="true"></span>
                  <strong>État de la maison :</strong>{" "}
                  <span
                    className={
                      logement.etatMaison === "saine"
                        ? "fr-badge fr-badge--success"
                        : logement.etatMaison === "très peu endommagée"
                        ? "fr-badge fr-badge--info"
                        : "fr-badge fr-badge--warning"
                    }>
                    {logement.etatMaison}
                  </span>
                </li>
              )}

              {logement.indemnisationPasseeRGA !== null && (
                <li className="fr-mb-2v">
                  <span className="fr-icon-money-euro-circle-fill fr-icon--sm fr-mr-1v" aria-hidden="true"></span>
                  <strong>Indemnisation passée RGA :</strong>{" "}
                  {logement.indemnisationPasseeRGA ? (
                    <span className="fr-badge fr-badge--warning">Oui</span>
                  ) : (
                    <span className="fr-badge fr-badge--success">Non</span>
                  )}
                </li>
              )}

              {logement.nombreHabitants && (
                <li className="fr-mb-2v">
                  <span className="fr-icon-group-fill fr-icon--sm fr-mr-1v" aria-hidden="true"></span>
                  <strong>Habitants du logement :</strong> {logement.nombreHabitants}{" "}
                  {logement.nombreHabitants > 1 ? "personnes" : "personne"}
                </li>
              )}

              {logement.niveauRevenu && (
                <li className="fr-mb-2v">
                  <span className="fr-icon-wallet-fill fr-icon--sm fr-mr-1v" aria-hidden="true"></span>
                  <strong>Niveau de revenu :</strong>{" "}
                  <span
                    className={
                      logement.niveauRevenu === "Très modeste"
                        ? "fr-badge fr-badge--success"
                        : logement.niveauRevenu === "Modeste"
                        ? "fr-badge fr-badge--info"
                        : logement.niveauRevenu === "Intermédiaire"
                        ? "fr-badge fr-badge--warning"
                        : "fr-badge"
                    }>
                    {logement.niveauRevenu}
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
