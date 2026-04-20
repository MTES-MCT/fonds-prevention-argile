"use client";

import Link from "next/link";

interface DossiersSuivisHeaderProps {
  nombreDossiers: number;
  canCreateDossier?: boolean;
}

export function DossiersSuivisHeader({ nombreDossiers, canCreateDossier = false }: DossiersSuivisHeaderProps) {
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
                Dossiers
              </a>
            </li>
          </ol>
        </div>
      </nav>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="fr-h1 fr-mb-0">Vos dossiers ({nombreDossiers})</h1>
          <p className="fr-mt-2w fr-text--xl text-gray-500">Retrouvez le détail de vos dossiers suivis</p>
        </div>
        {canCreateDossier && (
          <Link
            href="/espace-agent/dossiers/nouveau"
            className="fr-btn fr-icon-add-line fr-btn--icon-left self-start md:self-center">
            Nouveau dossier
          </Link>
        )}
      </div>
    </div>
  );
}
