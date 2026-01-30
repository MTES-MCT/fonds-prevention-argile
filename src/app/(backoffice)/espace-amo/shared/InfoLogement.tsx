import type { InfoLogement as InfoLogementType } from "@/features/backoffice/espace-amo/demande/domain/types";
import { formatDate, formatMontant } from "@/shared/utils";

interface DateIndemnisation {
  debut: Date;
  fin: Date;
  montant: number;
}

interface InfoLogementProps {
  logement: InfoLogementType;
  /** Informations sur l'indemnisation passée (optionnel, enrichit l'affichage) */
  dateIndemnisation?: DateIndemnisation;
}

/**
 * Composant affichant les informations sur le logement et l'éligibilité
 */
export function InfoLogement({ logement, dateIndemnisation }: InfoLogementProps) {
  // Formater le texte d'indemnisation si disponible
  const formatIndemnisationText = (indemnisation: DateIndemnisation) => {
    const debutStr = formatDate(indemnisation.debut.toISOString());
    const finStr = formatDate(indemnisation.fin.toISOString());
    const montantStr = formatMontant(indemnisation.montant);
    return `INDEMNISÉ ENTRE ${debutStr} ET ${finStr} (${montantStr})`;
  };

  // Déterminer le badge de risque argile
  const getRisqueArgileBadge = (zone: "faible" | "moyen" | "fort") => {
    switch (zone) {
      case "fort":
        return "fr-badge--error";
      case "moyen":
        return "fr-badge--warning";
      case "faible":
        return "fr-badge--info";
    }
  };

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
            {/* Risque argile (en premier) */}
            {logement.zoneExposition && (
              <li className="fr-mb-2v">
                Risque argile{" "}
                <span className={`fr-badge fr-badge--sm fr-badge--no-icon ${getRisqueArgileBadge(logement.zoneExposition)}`}>
                  {logement.zoneExposition.toUpperCase()}
                </span>
              </li>
            )}

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
                {dateIndemnisation ? (
                  <span className="fr-badge fr-badge--sm fr-badge--yellow-tournesol fr-badge--no-icon">
                    {formatIndemnisationText(dateIndemnisation)}
                  </span>
                ) : (
                  <span className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">
                    {logement.indemnisationPasseeRGA ? "OUI" : "NON"}
                  </span>
                )}
              </li>
            )}

            {/* Période d'indemnisation (si indemnisé avant juillet 2025) */}
            {logement.indemnisationPasseeRGA && logement.indemnisationAvantJuillet2025 && (
              <li className="fr-mb-2v">
                <span className="fr-badge fr-badge--sm fr-badge--yellow-tournesol fr-badge--no-icon">
                  INDEMNISÉ ENTRE 01/07/15 ET 01/07/25
                </span>
              </li>
            )}

            {/* Montant de l'indemnisation (si indemnisé entre 2015 et 2025 avec montant) */}
            {logement.indemnisationPasseeRGA &&
              logement.indemnisationAvantJuillet2025 &&
              logement.indemnisationAvantJuillet2015 === false &&
              logement.montantIndemnisation !== null && (
                <li className="fr-mb-2v">
                  Montant de l&apos;indemnité{" "}
                  <span className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon">
                    {formatMontant(logement.montantIndemnisation)}
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
                <span
                  className={`fr-badge fr-badge--sm fr-badge--no-icon ${
                    logement.niveauRevenu === "Très modeste"
                      ? "fr-badge--info fr-badge--no-icon"
                      : logement.niveauRevenu === "Modeste"
                        ? "fr-badge--yellow-tournesol"
                        : "fr-badge--purple-glycine"
                  }`}>
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
