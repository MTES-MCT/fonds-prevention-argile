import type { Metadata } from "next";

import Image from "next/image";
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

          <div className="fr-grid-row fr-grid-row--gutters items-center">
            <div className="fr-col-12 fr-col-md-6 text-center">
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
            <div className="fr-col-12 fr-col-md-6">
              <Image
                alt=""
                className="block w-full h-auto"
                height={hero.image.height}
                priority
                quality={85}
                sizes="(max-width: 768px) 100vw, 50vw"
                src={hero.image.src}
                width={hero.image.width}
              />
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
        separateur
        className="bg-(--background-alt-blue-france)">
        {sol.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </EtapeInfographie>

      <EtapeInfographie
        numero={2}
        titre={maison.title}
        chapeau={maison.lead}
        image={maison.image}
        legendes={maison.legendes}
        fleches={maison.fleches}
        imageADroite>
        <p>{maison.paragraph}</p>
      </EtapeInfographie>

      <EtapeInfographie
        numero={3}
        titre={environnement.title}
        chapeau={environnement.lead}
        image={environnement.image}
        legendes={environnement.legendes}
        fleches={environnement.fleches}
        separateur
        className="bg-(--background-alt-blue-france)">
        <div className="fr-callout fr-icon-focus-3-line fr-mb-0">
          <p className="fr-callout__text">{richTextParser(environnement.objectif)}</p>
        </div>
      </EtapeInfographie>

      <VulnerabiliteSection titre={agir.title} avecBadge={false} boutonPleineLargeur />
    </>
  );
}
