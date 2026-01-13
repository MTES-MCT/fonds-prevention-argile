import type { AllersVers } from "@/features/seo/allers-vers";

interface ConseillerCardProps {
  conseiller: AllersVers;
}

export function ConseillerCard({ conseiller }: ConseillerCardProps) {
  return (
    <div className="fr-card fr-card--no-arrow">
      <div className="fr-card__body">
        <div className="fr-card__content">
          <h3 className="fr-card__title">{conseiller.nom.toUpperCase()}</h3>

          <div className="fr-card__desc">
            {conseiller.emails && conseiller.emails.length > 0 && (
              <p className="fr-mb-1w">
                {conseiller.emails.map((email, index) => (
                  <span key={email}>
                    <a href={`mailto:${email}`} className="fr-text--sm text-gray-600">
                      {email}
                    </a>
                    {index < conseiller.emails.length - 1 && ", "}
                  </span>
                ))}
              </p>
            )}
            {conseiller.telephone && <p className="fr-mb-1w fr-text--sm text-gray-600">{conseiller.telephone}</p>}
            {conseiller.adresse && <p className="fr-mb-0 fr-text--sm text-gray-600">{conseiller.adresse}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
