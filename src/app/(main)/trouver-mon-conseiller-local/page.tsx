import type { Metadata } from "next";
import { getAllAllersVersWithRelationsAction } from "@/features/seo/allers-vers";
import { ConseillersClient } from "./components/ConseillersClient";
import content from "./content/content.json";
import Link from "next/link";

export const metadata: Metadata = {
  title: content.meta.title,
  description: content.meta.description,
  openGraph: {
    title: content.meta.title,
    description: content.meta.description,
    type: "website",
  },
};

export default async function TrouverConseillerPage() {
  const result = await getAllAllersVersWithRelationsAction();
  const conseillers = result.success ? result.data : [];

  return (
    <main>
      <section>
        <div className="fr-container">
          {/* Breadcrumb */}
          <nav role="navigation" className="fr-breadcrumb" aria-label="vous êtes ici :">
            <button className="fr-breadcrumb__button" aria-expanded="false" aria-controls="breadcrumb-rga">
              Voir le fil d'Ariane
            </button>
            <div className="fr-collapse" id="breadcrumb-rga">
              <ol className="fr-breadcrumb__list">
                <li>
                  <Link className="fr-breadcrumb__link" href="/">
                    {content.breadcrumb.home}
                  </Link>
                </li>
                <li>
                  <span className="fr-breadcrumb__link" aria-current="page">
                    {content.breadcrumb.currentPage}
                  </span>
                </li>
              </ol>
            </div>
          </nav>
        </div>
      </section>
      <ConseillersClient initialConseillers={conseillers} content={content.page} />
    </main>
  );
}
