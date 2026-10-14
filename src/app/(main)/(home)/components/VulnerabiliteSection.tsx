import Link from "next/link";
import content from "../content/content.json";
import type { CategorieAffichee } from "@/features/vulnerabilite-rga/domain/value-objects/grille-categorisation";
import { CategorieBadge } from "@/features/vulnerabilite-rga/components/shared/CategorieBadge";
import { isVulnerabiliteRgaActive } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite";

const section = content.vulnerabilite_section;

export default function VulnerabiliteSection() {
  // Feature hors production tant que la grille n'est pas validée (ADR-0030).
  if (!isVulnerabiliteRgaActive()) return null;

  return (
    <section id="vulnerabilite" className="fr-container-fluid fr-py-10w section-anchor">
      <div className="fr-container">
        <div className="fr-grid-row fr-grid-row--gutters items-center">
          <div className="fr-col-12 fr-col-md-6">
            <p className="fr-badge fr-badge--green-emeraude fr-mb-2w">{section.badge}</p>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
            <ul className="fr-raw-list fr-mb-3w">
              {section.points.map((point) => (
                <li key={point} className="fr-mb-1v">
                  <span
                    className="fr-icon-checkbox-circle-fill fr-icon--sm fr-mr-1w text-(--text-default-success)"
                    aria-hidden="true"
                  />
                  {point}
                </li>
              ))}
            </ul>
            <Link className="fr-btn fr-btn--lg fr-icon-arrow-right-line fr-btn--icon-right" href={section.cta_url}>
              {section.cta_label}
            </Link>
          </div>

          <div className="fr-col-12 fr-col-md-6">
            <div className="rounded-lg border border-solid border-(--border-default-grey) bg-(--background-alt-grey) p-6">
              <p className="fr-text--xs fr-mb-2w text-(--text-mention-grey)">{section.apercu.legende}</p>
              <p className="fr-text--bold fr-mb-2w">{section.apercu.titre}</p>
              <ul className="fr-raw-list">
                {section.apercu.lignes.map(({ categorie, nombre }) => (
                  <li
                    key={categorie}
                    className="flex items-center justify-between py-2 border-b border-solid border-(--border-default-grey) last:border-b-0">
                    <CategorieBadge categorie={categorie as CategorieAffichee} inline={false} pluriel={nombre > 1} />
                    <span className="fr-text--bold">{nombre}</span>
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
