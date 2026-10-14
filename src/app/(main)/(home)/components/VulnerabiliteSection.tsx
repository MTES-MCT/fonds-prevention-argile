import Link from "next/link";
import content from "../content/content.json";
import type { CategorieAffichee } from "@/features/vulnerabilite-rga/domain/value-objects/grille-categorisation";
import { CATEGORIES_AFFICHAGE } from "@/features/vulnerabilite-rga/domain/value-objects/grille-categorisation";
import { CategorieBadge } from "@/features/vulnerabilite-rga/components/shared/CategorieBadge";
import { isVulnerabiliteRgaActive } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite";

const section = content.vulnerabilite_section;

function libelleDecompte(categorie: CategorieAffichee, nombre: number): string {
  const { label, pluriel } = CATEGORIES_AFFICHAGE[categorie];
  return `${nombre} ${(nombre > 1 ? pluriel : label).toLowerCase()}`;
}

export default function VulnerabiliteSection() {
  // Feature hors production tant que la grille n'est pas validée (ADR-0030).
  if (!isVulnerabiliteRgaActive()) return null;

  return (
    <section id="vulnerabilite" className="fr-container-fluid fr-py-10w section-anchor">
      <div className="fr-container">
        <div className="fr-grid-row fr-grid-row--gutters">
          <div className="fr-col-12 fr-col-md-6">
            <p className="fr-badge fr-badge--new fr-mb-2w">{section.badge}</p>
            <h2>{section.title}</h2>
            <p className="fr-text--lg">{section.description}</p>

            <ol className="fr-raw-list fr-mt-4w fr-mb-4w">
              {section.etapes.map((etape, index) => (
                <li key={etape} className="flex items-start gap-3 fr-mb-2w">
                  <span
                    className="flex shrink-0 items-center justify-center w-6 h-6 rounded-full fr-text--sm fr-text--bold bg-(--background-action-high-blue-france) text-(--text-inverted-blue-france)"
                    aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="fr-text--lg fr-mb-0">{etape}</span>
                </li>
              ))}
            </ol>

            <Link
              className="fr-btn fr-btn--secondary fr-btn--lg fr-icon-arrow-right-line fr-btn--icon-right"
              href={section.cta_url}>
              {section.cta_label}
            </Link>
            <p className="fr-text--sm fr-mt-1w fr-mb-0">{section.mention}</p>
          </div>

          <div className="fr-col-12 fr-col-md-6">
            <div className="fr-mt-md-6w border border-solid border-(--border-default-grey) bg-(--background-default-grey) p-6 md:p-8">
              <p className="fr-h6 fr-mb-3w">{section.apercu.titre}</p>
              <div className="flex flex-wrap gap-2 fr-mb-3w">
                {section.apercu.resume.map(({ categorie, nombre }) => (
                  <CategorieBadge
                    key={categorie}
                    categorie={categorie as CategorieAffichee}
                    inline={false}
                    libelle={libelleDecompte(categorie as CategorieAffichee, nombre)}
                  />
                ))}
              </div>
              <ul className="fr-raw-list">
                {section.apercu.lignes.map(({ label, categorie }) => (
                  <li
                    key={label}
                    className="flex items-center justify-between gap-3 py-3 border-b border-solid border-(--border-default-grey)">
                    <span>{label}</span>
                    <span className="shrink-0">
                      <CategorieBadge categorie={categorie as CategorieAffichee} inline={false} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
