import { getAllersVersByDepartementAction } from "@/features/seo/allers-vers";
import { formatDepartementAvecArticle } from "@/shared/utils";
import Link from "next/link";

interface DisplayAllersVersProps {
  codeDepartement: string;
  nomDepartement: string;
}

/**
 * Composant serveur pour afficher les structures "Allers Vers" d'un département
 */
export async function DisplayAllersVers({ codeDepartement, nomDepartement }: DisplayAllersVersProps) {
  const result = await getAllersVersByDepartementAction(codeDepartement);

  // Si erreur ou pas de données, ne rien afficher
  if (!result.success || !result.data || result.data.length === 0) {
    return null;
  }

  const allersVers = result.data;
  const departementAvecArticle = formatDepartementAvecArticle(codeDepartement, nomDepartement);

  return (
    <div className="fr-container fr-my-8w">
      <div className="fr-callout">
        <h2 className="fr-callout__title">
          Besoin de plus d'information ? Contactez votre conseiller local {departementAvecArticle} ({codeDepartement}).
        </h2>
        <p className="fr-callout__text fr-text--lg">
          Un conseiller mandaté par l'État vous informe et répond à vos questions gratuitement dans le cadre du Fonds de
          Prévention Argile.
        </p>

        <div className="fr-grid-row fr-grid-row--gutters fr-mt-4w">
          {allersVers.map((av) => (
            <div key={av.id} className="fr-col-12 fr-col-md-6">
              <div className="fr-card fr-card--no-arrow">
                <div className="fr-card__body">
                  <div className="fr-card__content">
                    <h3 className="fr-card__title">{av.nom}</h3>
                    <div className="fr-card__desc">
                      {/* Email */}
                      {av.emails && av.emails.length > 0 && (
                        <p className="fr-mb-1w">
                          <Link href={`mailto:${av.emails[0]}`}>{av.emails[0]}</Link>
                        </p>
                      )}

                      {/* Téléphone */}
                      {av.telephone && <p className="fr-mb-1w">{av.telephone}</p>}

                      {/* Adresse */}
                      {av.adresse && (
                        <p className="fr-mb-1w fr-text--sm">
                          <span className="fr-icon-map-pin-2-line fr-mr-1v" aria-hidden="true"></span>
                          {av.adresse}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
