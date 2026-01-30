"use client";

import Link from "next/link";

export function AmoStatistiquesHeader() {
  return (
    <div className="fr-container fr-py-4w">
      <nav role="navigation" className="fr-breadcrumb" aria-label="vous êtes ici :">
        <button className="fr-breadcrumb__button" aria-expanded="false" aria-controls="breadcrumb-integration">
          Voir le fil d'Ariane
        </button>
        <div className="fr-collapse" id="breadcrumb-integration">
          <ol className="fr-breadcrumb__list">
            <li>
              <Link className="fr-breadcrumb__link" href="/">
                Accueil
              </Link>
            </li>
            <li>
              <a className="fr-breadcrumb__link" aria-current="page">
                Statistiques
              </a>
            </li>
          </ol>
        </div>
      </nav>
      <h1 className="fr-h1 fr-mb-0">Statistiques</h1>
      <p className="fr-mt-2w fr-text--xl text-gray-500">
        Retrouvez toutes les données liées à vos demandeurs suivis depuis le début
      </p>
    </div>
  );
}
