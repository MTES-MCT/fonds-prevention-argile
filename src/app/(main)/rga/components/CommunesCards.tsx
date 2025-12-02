import Link from "next/link";

import type { CommuneSEO } from "@/features/seo";

interface CommunesCardsProps {
  communes: CommuneSEO[];
  title: string;
}

export function CommunesCards({ communes, title }: CommunesCardsProps) {
  if (communes.length === 0) return null;

  return (
    <section className="fr-py-4w">
      <div className="fr-container">
        <h2>{title}</h2>

        <div className="fr-grid-row fr-grid-row--gutters">
          {communes.map((commune) => (
            <div key={commune.codeInsee} className="fr-col-12 fr-col-md-3">
              <div className="fr-tile fr-enlarge-link" id="tile-13">
                <div className="fr-tile__body">
                  <div className="fr-tile__content">
                    <h3 className="fr-tile__title">
                      <Link href={`/rga/commune/${commune.slug}`}>
                        Risques Retrait-Gonflement des Argiles à {commune.nom} (
                        {commune.codesPostaux[0] || commune.codeInsee})
                      </Link>
                    </h3>
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
