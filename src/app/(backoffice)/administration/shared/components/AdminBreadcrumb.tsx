import Link from "next/link";

interface AdminBreadcrumbProps {
  currentPageLabel: string;
  // Pages intermédiaires entre le tableau de bord et la page courante.
  parents?: { label: string; href: string }[];
}

export function AdminBreadcrumb({ currentPageLabel, parents = [] }: AdminBreadcrumbProps) {
  const id = "breadcrumb-admin";

  return (
    <nav role="navigation" className="fr-breadcrumb fr-mb-2w" aria-label="vous êtes ici :">
      <button className="fr-breadcrumb__button" aria-expanded="false" aria-controls={id}>
        Voir le fil d&apos;Ariane
      </button>
      <div className="fr-collapse" id={id}>
        <ol className="fr-breadcrumb__list">
          <li>
            <Link className="fr-breadcrumb__link" href="/administration">
              Tableau de bord
            </Link>
          </li>
          {parents.map((parent) => (
            <li key={parent.href}>
              <Link className="fr-breadcrumb__link" href={parent.href}>
                {parent.label}
              </Link>
            </li>
          ))}
          <li>
            <span className="fr-breadcrumb__link" aria-current="page">
              {currentPageLabel}
            </span>
          </li>
        </ol>
      </div>
    </nav>
  );
}
