import Link from "next/link";
import { DECISIONS_DATA_GOUV, type LigneHistoriqueCatnat } from "@/features/seo/catnat/domain";

interface CatnatTableCommuneProps {
  lignes: LigneHistoriqueCatnat[];
  nomCommune: string;
  codeDepartement: string;
}

const formatDate = (dateString: string): string => {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
};

const pluriel = (nombre: number) => (nombre > 1 ? "s" : "");

function BadgeDecision({ decision }: Pick<LigneHistoriqueCatnat, "decision">) {
  return decision === "reconnue" ? (
    <p className="fr-badge fr-badge--success fr-badge--sm">Reconnue</p>
  ) : (
    <p className="fr-badge fr-badge--warning fr-badge--sm">Non reconnue</p>
  );
}

/**
 * Composant pour afficher l'historique des catastrophes naturelles d'une commune
 */
export function CatnatTableCommune({ lignes, nomCommune, codeDepartement }: CatnatTableCommuneProps) {
  if (lignes.length === 0) {
    return null;
  }

  const nbReconnues = lignes.filter((ligne) => ligne.decision === "reconnue").length;
  const nbNonReconnues = lignes.length - nbReconnues;

  const reconnues = `${nbReconnues} sécheresse${pluriel(nbReconnues)} classée${pluriel(nbReconnues)} en catastrophe naturelle dans ma commune`;
  const nonReconnues = `${nbNonReconnues} demande${pluriel(nbNonReconnues)} de reconnaissance non accordée${pluriel(nbNonReconnues)} depuis ${DECISIONS_DATA_GOUV.depuis}`;

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

          {/* Colonne droite : Bandeau, légende et tableau */}
          <div className="fr-col-12 fr-col-md-7">
            <div className="fr-notice fr-notice--info fr-notice--no-icon fr-mb-3w">
              <div className="fr-container">
                <div className="fr-notice__body">
                  <p>
                    <span className="fr-notice__title">{nbReconnues > 0 ? reconnues : nonReconnues}</span>
                    {nbReconnues > 0 && nbNonReconnues > 0 && (
                      <>
                        <br />
                        <span className="fr-notice__desc">{nonReconnues}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {nbNonReconnues > 0 && (
              <ul className="fr-raw-list fr-text--sm fr-mb-3w">
                <li className="fr-mb-1w">
                  <BadgeDecision decision="reconnue" /> L'État a reconnu la sécheresse comme catastrophe naturelle dans
                  la commune : les dégâts sur les logements peuvent être indemnisés par les assurances.
                </li>
                <li>
                  <BadgeDecision decision="non_reconnue" /> La commune a demandé cette reconnaissance et ne l'a pas
                  obtenue. Cela ne veut pas dire qu'aucun logement n'a été touché : le retrait-gonflement des argiles
                  peut fissurer une maison sans que la commune soit reconnue.
                </li>
              </ul>
            )}

            <div className="fr-table fr-table--bordered">
              <div className="fr-table__wrapper">
                <div className="fr-table__container">
                  <div className="fr-table__content">
                    <table>
                      <caption className="fr-sr-only">
                        Sécheresses à {nomCommune} : {nbReconnues} reconnue{pluriel(nbReconnues)} en catastrophe
                        naturelle
                        {nbNonReconnues > 0 &&
                          `, ${nbNonReconnues} demande${pluriel(nbNonReconnues)} non reconnue${pluriel(nbNonReconnues)}`}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Décision</th>
                          <th scope="col">Période de sécheresse</th>
                          <th scope="col">Journal officiel du</th>
                          <th scope="col">Code NOR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lignes.map((ligne, index) => (
                          <tr key={`${ligne.decision}-${ligne.dateDebut}-${ligne.datePublicationJo}-${index}`}>
                            <td>
                              <BadgeDecision decision={ligne.decision} />
                              {ligne.motif && (
                                <p className="fr-text--xs fr-mt-1v fr-mb-0 min-w-40 whitespace-normal">
                                  Motif : {ligne.motif}
                                </p>
                              )}
                            </td>
                            <td>
                              {formatDate(ligne.dateDebut)} au {formatDate(ligne.dateFin)}
                            </td>
                            <td>{formatDate(ligne.datePublicationJo)}</td>
                            <td>{ligne.codeNor ?? <span aria-label="Non disponible">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {nbNonReconnues > 0 && (
              <p className="fr-hint-text">
                Les demandes non reconnues sont affichées depuis {DECISIONS_DATA_GOUV.depuis}, date des premières
                données disponibles.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
