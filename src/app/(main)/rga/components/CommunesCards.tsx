import type { CommuneSEO } from "@/features/seo";

interface CommunesCardsProps {
  communes: CommuneSEO[];
  title: string;
  description?: string;
}

export function CommunesCards({ communes, title, description }: CommunesCardsProps) {
  if (communes.length === 0) return null;

  return (
    <section className="fr-py-4w">
      <div className="fr-container">
        <h2>{title}</h2>
        {description && <p>{description}</p>}

        <div className="fr-grid-row fr-grid-row--gutters">
          {communes.map((commune) => (
            <div key={commune.codeInsee} className="fr-col-12 fr-col-md-3">
              <div className="fr-card fr-card--no-arrow">
                <div className="fr-card__body">
                  <div className="fr-card__content">
                    <h3 className="fr-card__title">
                      <a href={`/rga/commune/${commune.slug}`}>{commune.nom}</a>
                    </h3>
                    <p className="fr-card__desc">{commune.population.toLocaleString("fr-FR")} habitants</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
