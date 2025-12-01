import type { DepartementSEO, CommuneSEO, EpciSEO } from "@/features/seo";
import Link from "next/link";

interface RgaBreadcrumbProps {
  departement?: DepartementSEO;
  commune?: CommuneSEO;
  epci?: EpciSEO;
}

export function RgaBreadcrumb({ departement, commune, epci }: RgaBreadcrumbProps) {
  const id = `breadcrumb-${commune?.slug || epci?.slug || departement?.slug || "rga"}`;

  return (
    <nav role="navigation" className="fr-breadcrumb" aria-label="vous êtes ici :">
      <button className="fr-breadcrumb__button" aria-expanded="false" aria-controls={id}>
        Voir le fil d'Ariane
      </button>
      <div className="fr-collapse" id={id}>
        <ol className="fr-breadcrumb__list">
          <li>
            <Link className="fr-breadcrumb__link" href="/">
              Accueil
            </Link>
          </li>
          <li>
            <Link className="fr-breadcrumb__link" href="/rga">
              RGA
            </Link>
          </li>
          {departement && (
            <li>
              {commune || epci ? (
                <a className="fr-breadcrumb__link" href={`/rga/departement/${departement.slug}`}>
                  {departement.nom}
                </a>
              ) : (
                <span className="fr-breadcrumb__link" aria-current="page">
                  {departement.nom}
                </span>
              )}
            </li>
          )}
          {commune && (
            <li>
              <span className="fr-breadcrumb__link" aria-current="page">
                {commune.nom}
              </span>
            </li>
          )}
          {epci && (
            <li>
              <span className="fr-breadcrumb__link" aria-current="page">
                {epci.nom}
              </span>
            </li>
          )}
        </ol>
      </div>
    </nav>
  );
}
