import { DemarcheDetailed } from "@/features/parcours/dossiers-ds/adapters/graphql";

interface DemarcheInfoProps {
  demarche: DemarcheDetailed;
}

export default function DemarcheInfo({ demarche }: DemarcheInfoProps) {
  return (
    <div className="fr-card fr-mb-4w">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <h2 className="fr-card__title">{demarche.title}</h2>
          <p className="fr-text--lg fr-text--bold fr-mb-2w">
            Démarche n°{demarche.number}
          </p>

          <div className="fr-grid-row fr-grid-row--gutters">
            <div className="fr-col-12 fr-col-md-6">
              <p className="fr-text--sm fr-text--mention-grey fr-mb-1v">État</p>
              <p className="fr-badge fr-badge--info">{demarche.state}</p>
            </div>

            <div className="fr-col-12 fr-col-md-6">
              <p className="fr-text--sm fr-text--mention-grey fr-mb-1v">
                Date de création
              </p>
              <p className="fr-text--md">
                {new Date(demarche.dateCreation).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {demarche.description && (
            <div className="fr-mt-3w">
              <p className="fr-text--sm fr-text--mention-grey fr-mb-1v">
                Description
              </p>
              <p className="fr-text--md">{demarche.description}</p>
            </div>
          )}

          {demarche.service && (
            <div className="fr-mt-3w">
              <p className="fr-text--sm fr-text--mention-grey fr-mb-1v">
                Service responsable
              </p>
              <p className="fr-text--md fr-text--bold">
                {demarche.service.nom}
              </p>
              <p className="fr-text--sm">{demarche.service.organisme}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
