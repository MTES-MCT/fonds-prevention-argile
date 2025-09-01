import { notFound } from "next/navigation";
import { getDemarchesSimplifieesClient } from "@/lib/api/demarches-simplifiees";
import { getServerEnv } from "@/lib/config/env.config";

export default async function AdminPage() {
  const env = getServerEnv();
  const demarcheId = parseInt(env.DEMARCHES_SIMPLIFIEES_ID_DEMARCHE);

  const client = getDemarchesSimplifieesClient();
  const demarche = await client.getDemarcheDetailed(demarcheId);

  if (!demarche) {
    notFound();
  }

  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container [&_h2]:text-[var(--text-title-grey)]! [&_h2]:mt-10!">
        <h1 className="fr-h1 fr-mb-4w">Démarche : {demarche.title}</h1>
        <div className="fr-grid-row fr-grid-row--gutters">
          <div className="fr-col-12">
            <div className="fr-callout">
              <h3 className="fr-callout__title">Informations générales</h3>

              <div className="fr-grid-row fr-grid-row--gutters fr-mb-2w">
                <div className="fr-col-12 fr-col-md-6">
                  <p className="fr-text--sm fr-mb-0">Numéro de démarche</p>
                  <p className="fr-text--lg fr-text--bold fr-mb-0">
                    {demarche.number}
                  </p>
                </div>
                <div className="fr-col-12 fr-col-md-6">
                  <p className="fr-text--sm fr-mb-0">État</p>
                  <p className="fr-badge fr-badge--info">{demarche.state}</p>
                </div>
              </div>

              <div className="fr-grid-row fr-grid-row--gutters">
                <div className="fr-col-12">
                  <p className="fr-text--sm fr-mb-0">Date de création</p>
                  <p className="fr-text--md fr-mb-0">
                    {new Date(demarche.dateCreation).toLocaleDateString(
                      "fr-FR"
                    )}
                  </p>
                </div>
              </div>
            </div>

            {demarche.description && (
              <div className="fr-callout fr-mt-3w">
                <h3 className="fr-callout__title">Description</h3>
                <p className="fr-callout__text">{demarche.description}</p>
              </div>
            )}

            {demarche.service && (
              <div className="fr-callout fr-callout--blue-ecume fr-mt-3w">
                <h3 className="fr-callout__title">Service responsable</h3>
                <p className="fr-text--bold fr-mb-1w">{demarche.service.nom}</p>
                <p className="fr-text--sm fr-mb-0">
                  {demarche.service.organisme}
                </p>
                {demarche.service.typeOrganisme && (
                  <p className="fr-text--xs fr-mb-0 fr-mt-1w">
                    Type : {demarche.service.typeOrganisme}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
