import type { CatastropheNaturelle } from "@/shared/database/schema/catastrophes-naturelles";
import Link from "next/link";

interface CatnatTableCommuneProps {
  catnats: CatastropheNaturelle[];
  nomCommune: string;
  codeDepartement: string;
}

/**
 * Composant pour afficher l'historique des catastrophes naturelles d'une commune
 */
export function CatnatTableCommune({ catnats, nomCommune, codeDepartement }: CatnatTableCommuneProps) {
  // Ne rien afficher s'il n'y a pas de catastrophes
  if (catnats.length === 0) {
    return null;
  }

  // Compter le nombre de sécheresses
  const nbSecheresses = catnats.filter((c) => c.libelleRisqueJo.toLowerCase().includes("sécheresse")).length;

  // Formater les dates au format français
  const formatDate = (dateString: string): string => {
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <section className="fr-py-6w">
      <div className="fr-container">
        <div className="fr-grid-row fr-grid-row--gutters">
          {/* Colonne gauche : Titre et description */}
          <div className="fr-col-12 fr-col-md-5">
            <h2 className="fr-h3 fr-mb-2w">
              Historique des catastrophes naturelles à {nomCommune} ({codeDepartement})
            </h2>
            <p className="fr-text--sm fr-mb-2w">
              Depuis plus de 10 ans, les épisodes de sécheresse intense se multiplient, entraînant des mouvements
              répétés des sols argileux. Même si votre logement n'a pas encore été touché par le RGA, le risque sur
              votre territoire augmente de jour en jour.
            </p>
            <p className="fr-text--sm fr-mb-2w">Intervenez avant que les dommages ne soient trop important.</p>
            <Link
              href="https://www.georisques.gouv.fr/risques/retrait-gonflement-des-argiles"
              target="_blank"
              rel="noopener noreferrer"
              className="fr-link fr-link--icon-right fr-icon-external-link-line">
              Plus d'informations sur Géorisques
            </Link>
          </div>

          {/* Colonne droite : Badge et tableau */}
          <div className="fr-col-12 fr-col-md-7">
            {/* Badge informatif */}
            {nbSecheresses > 0 && (
              <div className="fr-notice fr-notice--info fr-notice--no-icon fr-mb-3w">
                <div className="fr-container">
                  <div className="fr-notice__body">
                    <p>
                      <span className="fr-notice__title">
                        {nbSecheresses} sécheresse{nbSecheresses > 1 ? "s" : ""} classée{nbSecheresses > 1 ? "s" : ""}{" "}
                        en catastrophe naturelle dans ma commune
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tableau des catastrophes avec structure DSFR complète */}
            <div className="fr-table fr-table--bordered">
              <div className="fr-table__wrapper">
                <div className="fr-table__container">
                  <div className="fr-table__content">
                    <table>
                      <caption className="fr-sr-only">
                        Liste des {nbSecheresses} sécheresse{nbSecheresses > 1 ? "s" : ""} classée
                        {nbSecheresses > 1 ? "s" : ""} en catastrophe naturelle à {nomCommune}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Code NOR</th>
                          <th scope="col">Libellé</th>
                          <th scope="col">Début le</th>
                          <th scope="col">Journal officiel du</th>
                        </tr>
                      </thead>
                      <tbody>
                        {catnats.map((catnat, index) => (
                          <tr key={`${catnat.codeNationalCatnat}-${catnat.codeInsee}-${index}`}>
                            <td>{catnat.codeNationalCatnat}</td>
                            <td>{catnat.libelleRisqueJo}</td>
                            <td>{formatDate(catnat.dateDebutEvt)}</td>
                            <td>{formatDate(catnat.datePublicationJo)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Message si pas de sécheresse (ne devrait plus arriver avec le filtrage RGA) */}
            {nbSecheresses === 0 && catnats.length > 0 && (
              <p className="fr-text--sm fr-mt-2w">
                Cette commune a connu {catnats.length} catastrophe{catnats.length > 1 ? "s" : ""} naturelle
                {catnats.length > 1 ? "s" : ""}, mais aucune liée à la sécheresse.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
