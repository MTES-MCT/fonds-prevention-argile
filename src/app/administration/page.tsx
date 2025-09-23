import { notFound } from "next/navigation";
import { getServerEnv } from "@/lib/config/env.config";
import {
  getDemarcheDetails,
  getDossiers,
} from "@/lib/actions/demarches-simplifies";

// Fonction pour formater les états des dossiers
function getStateLabel(state: string): string {
  const stateLabels: Record<string, string> = {
    en_construction: "En construction",
    en_instruction: "En instruction",
    accepte: "Accepté",
    refuse: "Refusé",
    sans_suite: "Sans suite",
  };
  return stateLabels[state] || state;
}

// Fonction pour obtenir la classe CSS du badge selon l'état
function getStateBadgeClass(state: string): string {
  const stateClasses: Record<string, string> = {
    en_construction: "fr-badge--new",
    en_instruction: "fr-badge--info",
    accepte: "fr-badge--success",
    refuse: "fr-badge--error",
    sans_suite: "fr-badge--warning",
  };
  return `fr-badge ${stateClasses[state] || ""}`;
}

export default async function Admin() {
  const env = getServerEnv();
  const demarcheId = parseInt(env.DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE);

  // Utiliser les server actions
  const [demarcheResponse, dossiersResponse] = await Promise.all([
    getDemarcheDetails(demarcheId),
    getDossiers(demarcheId, { first: 100 }),
  ]);

  if (!demarcheResponse.success) {
    notFound();
  }

  const demarche = demarcheResponse.data;
  const dossiersConnection = dossiersResponse.success
    ? dossiersResponse.data
    : null;

  const dossiers = dossiersConnection?.nodes || [];
  const hasMoreDossiers = dossiersConnection?.pageInfo?.hasNextPage || false;

  // Calcul des statistiques
  const stats = dossiers.reduce(
    (acc, dossier) => {
      acc.total++;
      acc.byState[dossier.state] = (acc.byState[dossier.state] || 0) + 1;
      if (dossier.archived) acc.archived++;
      return acc;
    },
    {
      total: 0,
      byState: {} as Record<string, number>,
      archived: 0,
    }
  );

  return (
    <section className="fr-container fr-py-6w">
      {/* En-tête avec titre et statistiques */}
      <div className="fr-grid-row fr-grid-row--gutters fr-mb-4w">
        <div className="fr-col-12">
          <h1 className="fr-h2 fr-mb-2w">{demarche.title}</h1>
          <p className="fr-text--lg fr-text--bold fr-mb-0">
            Démarche n°{demarche.number}
          </p>
        </div>
      </div>

      {/* Cartes de statistiques */}
      <div className="fr-grid-row fr-grid-row--gutters fr-mb-6w">
        <div className="fr-col-12 fr-col-md-3">
          <div className="fr-tile fr-tile--horizontal">
            <div className="fr-tile__body">
              <div className="fr-tile__content">
                <h3 className="fr-tile__title">Total dossiers</h3>
                <p className="fr-display-xs fr-mb-0 fr-text--bold">
                  {stats.total}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="fr-col-12 fr-col-md-3">
          <div className="fr-tile fr-tile--horizontal">
            <div className="fr-tile__body">
              <div className="fr-tile__content">
                <h3 className="fr-tile__title">En construction</h3>
                <p className="fr-display-xs fr-mb-0 fr-text--bold">
                  {stats.byState.en_construction || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="fr-col-12 fr-col-md-3">
          <div className="fr-tile fr-tile--horizontal">
            <div className="fr-tile__body">
              <div className="fr-tile__content">
                <h3 className="fr-tile__title">En instruction</h3>
                <p className="fr-display-xs fr-mb-0 fr-text--bold">
                  {stats.byState.en_instruction || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="fr-col-12 fr-col-md-3">
          <div className="fr-tile fr-tile--horizontal">
            <div className="fr-tile__body">
              <div className="fr-tile__content">
                <h3 className="fr-tile__title">Acceptés</h3>
                <p className="fr-display-xs fr-mb-0 fr-text--bold fr-text--success">
                  {stats.byState.accepte || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Informations de la démarche */}
      <div className="fr-accordions-group fr-mb-6w">
        <section className="fr-accordion">
          <h3 className="fr-accordion__title">
            <button
              className="fr-accordion__btn"
              aria-expanded="false"
              aria-controls="accordion-info"
            >
              Informations de la démarche
            </button>
          </h3>
          <div className="fr-collapse" id="accordion-info">
            <div className="fr-grid-row fr-grid-row--gutters fr-py-3w">
              <div className="fr-col-12 fr-col-md-6">
                <p className="fr-text--sm fr-text--mention-grey fr-mb-1v">
                  État
                </p>
                <p className="fr-badge fr-badge--info fr-mb-3w">
                  {demarche.state}
                </p>

                <p className="fr-text--sm fr-text--mention-grey fr-mb-1v">
                  Date de création
                </p>
                <p className="fr-text--md fr-mb-0">
                  {new Date(demarche.dateCreation).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <div className="fr-col-12 fr-col-md-6">
                {demarche.service && (
                  <>
                    <p className="fr-text--sm fr-text--mention-grey fr-mb-1v">
                      Service responsable
                    </p>
                    <p className="fr-text--md fr-text--bold fr-mb-1v">
                      {demarche.service.nom}
                    </p>
                    <p className="fr-text--sm fr-mb-0">
                      {demarche.service.organisme}
                    </p>
                  </>
                )}
              </div>

              {demarche.description && (
                <div className="fr-col-12 fr-mt-3w">
                  <p className="fr-text--sm fr-text--mention-grey fr-mb-1v">
                    Description
                  </p>
                  <p className="fr-text--md">{demarche.description}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Tableau des dossiers */}
      <div className="fr-mb-6w">
        <h2 className="fr-h3 fr-mb-3w">Liste des dossiers</h2>

        {dossiers.length === 0 ? (
          <div className="fr-notice fr-notice--info">
            <div className="fr-container">
              <div className="fr-notice__body">
                <p className="fr-notice__title">Aucun dossier trouvé</p>
                <p className="fr-text--sm">
                  Cette démarche ne contient aucun dossier pour le moment.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="fr-table" id="table-dossiers">
              <div className="fr-table__wrapper">
                <div className="fr-table__container">
                  <div className="fr-table__content">
                    <table id="table-0">
                      <caption>
                        {dossiers.length} dossiers présents
                        {hasMoreDossiers && " (limité aux 100 premiers)"}
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">N° Dossier</th>
                          <th scope="col">Email usager</th>
                          <th scope="col">État</th>
                          <th scope="col">Date de dépôt</th>
                          <th scope="col">Date de traitement</th>
                          <th scope="col">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dossiers.map((dossier, index) => (
                          <tr
                            key={dossier.id}
                            id={`table-dossiers-row-${index}`}
                            data-row-key={dossier.number}
                          >
                            <td>
                              <span className="fr-text--bold fr-text--md">
                                {dossier.number}
                              </span>
                            </td>
                            <td>
                              {dossier.usager?.email ? (
                                <span className="fr-text--sm">
                                  {dossier.usager.email}
                                </span>
                              ) : (
                                <span className="fr-text--sm fr-text--mention-grey">
                                  Non renseigné
                                </span>
                              )}
                            </td>
                            <td>
                              <div>
                                <p
                                  className={`${getStateBadgeClass(dossier.state)} fr-badge--sm fr-mb-0`}
                                >
                                  {getStateLabel(dossier.state)}
                                </p>
                                {dossier.archived && (
                                  <p className="fr-badge fr-badge--sm fr-badge--no-icon fr-mt-1v fr-mb-0">
                                    Archivé
                                  </p>
                                )}
                              </div>
                            </td>
                            <td>
                              {dossier.datePassageEnConstruction ? (
                                <span className="fr-text--sm">
                                  {new Date(
                                    dossier.datePassageEnConstruction
                                  ).toLocaleDateString("fr-FR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  })}
                                </span>
                              ) : (
                                <span className="fr-text--sm fr-text--mention-grey">
                                  —
                                </span>
                              )}
                            </td>
                            <td>
                              {dossier.dateTraitement ? (
                                <span className="fr-text--sm">
                                  {new Date(
                                    dossier.dateTraitement
                                  ).toLocaleDateString("fr-FR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  })}
                                </span>
                              ) : (
                                <span className="fr-text--sm fr-text--mention-grey">
                                  En cours
                                </span>
                              )}
                            </td>
                            <td>
                              <a
                                href={`/dashboard`}
                                className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-btn--icon-left fr-icon-eye-line"
                                title={`Consulter le dossier ${dossier.number}`}
                              >
                                Consulter
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {hasMoreDossiers && (
              <div className="fr-notice fr-notice--info fr-mt-3w">
                <div className="fr-container">
                  <div className="fr-notice__body">
                    <p className="fr-notice__title">
                      Affichage limité aux 100 premiers dossiers
                    </p>
                    <p className="fr-text--sm">
                      D'autres dossiers existent pour cette démarche. Pour les
                      consulter tous, utilisez les filtres ou la pagination.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
