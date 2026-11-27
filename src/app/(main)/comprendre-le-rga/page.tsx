import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import VulnerabiliteSection from "@/app/(main)/(home)/components/VulnerabiliteSection";
import { isVulnerabiliteRgaActive } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite";
import { VULNERABILITE_RGA_URL } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-routes";
import { richTextParser } from "@/shared/utils";

import EtapeInfographie from "./components/EtapeInfographie";
import content from "./content/content.json";

const DESCRIPTION =
  "Le sol, la maison, son environnement proche : comprendre en 3 temps pourquoi une maison est vulnérable au retrait-gonflement des argiles, et comment la protéger.";

export const metadata: Metadata = {
  title: "Ma maison est-elle vulnérable au RGA ? | Fonds Prévention Argile",
  description: DESCRIPTION,
  openGraph: {
    title: "Ma maison est-elle vulnérable au RGA ? | Fonds Prévention Argile",
    description: DESCRIPTION,
    type: "website",
  },
};

interface ListeProps {
  titre: string;
  items: string[];
  icon: string;
  couleur: string;
}

function ListeEnvironnement({ titre, items, icon, couleur }: ListeProps) {
  return (
    <div className="fr-col-12 fr-col-md-6">
      <h3 className="fr-h5">{titre}</h3>
      <ul className="fr-raw-list">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 fr-mb-2w">
            <span className={`${icon} shrink-0 ${couleur}`} aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ComprendreLeRgaPage() {
  // Toute la page mène au simulateur de vulnérabilité, hors production (ADR-0030).
  if (!isVulnerabiliteRgaActive()) notFound();

  const { hero, sol, maison, environnement, agir } = content;

  return (
    <>
      <section className="fr-container-fluid fr-pb-4w">
        <div className="fr-container">
          <nav role="navigation" className="fr-breadcrumb" aria-label="vous êtes ici :">
            <button
              className="fr-breadcrumb__button"
              aria-expanded="false"
              aria-controls="breadcrumb-comprendre-le-rga">
              Voir le fil d'Ariane
            </button>
            <div className="fr-collapse" id="breadcrumb-comprendre-le-rga">
              <ol className="fr-breadcrumb__list">
                <li>
                  <Link className="fr-breadcrumb__link" href="/">
                    {content.breadcrumb.home}
                  </Link>
                </li>
                <li>
                  <span className="fr-breadcrumb__link" aria-current="page">
                    {content.breadcrumb.current}
                  </span>
                </li>
              </ol>
            </div>
          </nav>

          <div className="fr-grid-row fr-grid-row--center">
            <div className="fr-col-12 fr-col-lg-9 text-center">
              <h1>{hero.title}</h1>
              <p className="fr-text--lead">
                {hero.subtitle.avant}{" "}
                <span className="fr-px-1w font-bold italic whitespace-nowrap bg-(--background-action-high-blue-france) text-(--text-inverted-blue-france)">
                  {hero.subtitle.accent}
                </span>{" "}
                {hero.subtitle.apres}
              </p>
              <Link
                className="fr-btn fr-btn--lg fr-icon-arrow-right-line fr-btn--icon-right"
                href={VULNERABILITE_RGA_URL}>
                {hero.cta_label}
              </Link>
              <p className="fr-text--sm fr-mt-1w fr-mb-0">{hero.mention}</p>
            </div>
          </div>
        </div>
      </section>

      <EtapeInfographie
        numero={1}
        titre={sol.title}
        chapeau={sol.lead}
        image={sol.image}
        legendes={sol.legendes}
        imagePrioritaire>
        {sol.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </EtapeInfographie>

      <EtapeInfographie numero={2} titre={maison.title} chapeau={maison.lead} image={maison.image} imageADroite>
        <p>{maison.paragraph}</p>
        <ul className="fr-raw-list">
          {maison.points.map((point) => (
            <li
              key={point.title}
              className="fr-mb-2w fr-pl-2w border-l-4 border-solid border-(--border-default-blue-france)">
              <span className="fr-text--bold">{point.title}</span>
              <br />
              {point.text}
            </li>
          ))}
        </ul>
      </EtapeInfographie>

      <EtapeInfographie
        numero={3}
        titre={environnement.title}
        chapeau={environnement.lead}
        image={environnement.image}
        complement={
          <div className="fr-grid-row fr-grid-row--gutters fr-mt-4w">
            <ListeEnvironnement
              titre={environnement.fragilise.title}
              items={environnement.fragilise.items}
              icon="fr-icon-error-warning-line"
              couleur="text-(--text-default-warning)"
            />
            <ListeEnvironnement
              titre={environnement.bonnes_pratiques.title}
              items={environnement.bonnes_pratiques.items}
              icon="fr-icon-checkbox-circle-line"
              couleur="text-(--text-default-success)"
            />
          </div>
        }>
        <div className="fr-callout fr-icon-focus-3-line fr-mb-0">
          <p className="fr-callout__text">{richTextParser(environnement.objectif)}</p>
        </div>
      </EtapeInfographie>

      <VulnerabiliteSection titre={agir.title} avecBadge={false} className="bg-(--background-alt-blue-france)">
        <p className="fr-mt-4w fr-mb-0">
          {agir.aides.text}{" "}
          <Link className="fr-link" href={agir.aides.cta_url}>
            {agir.aides.cta_label}
          </Link>
        </p>
      </VulnerabiliteSection>

      <div className="fr-container fr-py-4w">
        <p className="fr-text--sm fr-mb-0 text-(--text-mention-grey)">{content.avertissement}</p>
      </div>
    </>
  );
}
