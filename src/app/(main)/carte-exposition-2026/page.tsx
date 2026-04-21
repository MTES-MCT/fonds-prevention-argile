import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";

import SavoirSiConcerneSection from "@/app/(main)/(home)/components/SavoirSiConcerneSection";

import content from "./content/content.json";

export const metadata: Metadata = {
  title: "Carte d'exposition RGA 2026 | Fonds Prévention Argile",
  description:
    "L'arrêté du 9 janvier 2026 met à jour la carte des zones exposées aux RGA et étend le nombre de logements éligibles.",
  openGraph: {
    title: "Carte d'exposition RGA 2026 | Fonds Prévention Argile",
    description: "L'arrêté du 9 janvier 2026 met à jour la carte des zones exposées aux RGA et étend le nombre de logments éligibles.",
    type: "website",
  },
};

export default function CarteExposition2026Page() {
  return (
    <>
      {/* Section 1 : Hero */}
      <section className="fr-py-2v">
        <div className="fr-container">
          {/* Fil d'Ariane */}
          <nav role="navigation" className="fr-breadcrumb" aria-label="vous êtes ici :">
            <button className="fr-breadcrumb__button" aria-expanded="false" aria-controls="breadcrumb-carte-expo">
              Voir le fil d'Ariane
            </button>
            <div className="fr-collapse" id="breadcrumb-carte-expo">
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

          <h1>{content.hero.title}</h1>
          <p className="fr-text--sm fr-mb-4w" style={{ color: "var(--text-mention-grey)" }}>
            {content.hero.source}
          </p>

          <div className="fr-grid-row fr-grid-row--gutters">
            {/* Colonne gauche : carte */}
            <div className="fr-col-12 fr-col-md-5">
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg">
                <Image
                  alt={content.hero.image.alt}
                  className="object-contain"
                  fill
                  priority
                  quality={85}
                  sizes="(max-width: 768px) 100vw, 40vw"
                  src={content.hero.image.src}
                />
              </div>
            </div>

            {/* Colonne droite : encadre info */}
            <div className="fr-col-12 fr-col-md-7">
              <h2>{content.hero.info_card.title}</h2>
              {content.hero.info_card.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              <Link
                className="fr-btn fr-btn--icon-right fr-icon-arrow-right-line fr-mt-2w fr-mb-4w"
                href={content.hero.info_card.cta_url}>
                {content.hero.info_card.cta_label}
              </Link>

              <div className="fr-callout">
                <h3 className="fr-callout__title">{content.hero.links.title}</h3>
                <ul className="fr-mt-2w">
                  {content.hero.links.items.map((link, index) => (
                    <li key={index} className="fr-mb-1w">
                      <a
                        className="fr-link fr-icon-external-link-line fr-link--icon-right"
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 : FAQ */}
      <section className="fr-container-fluid fr-py-10w">
        <div className="fr-container">
          <div className="fr-grid-row fr-grid-row--gutters">
            {/* Titre a gauche */}
            <div className="fr-col-12 fr-col-lg-4">
              <h2>{content.faq_section.title}</h2>
            </div>

            {/* Accordions a droite */}
            <div className="fr-col-12 fr-col-lg-8">
              <div data-fr-group="true" className="fr-accordions-group">
                {content.faq_section.faqs.map((faq, index) => (
                  <section key={`faq-${index}`} className="fr-accordion">
                    <h3 className="fr-accordion__title">
                      <button
                        type="button"
                        className="fr-accordion__btn"
                        aria-expanded="false"
                        aria-controls={`accordion-carte-expo-${index + 1}`}>
                        {faq.question}
                      </button>
                    </h3>
                    <div className="fr-collapse" id={`accordion-carte-expo-${index + 1}`}>
                      <div dangerouslySetInnerHTML={{ __html: faq.answer }} />
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3 : CTA */}
      <SavoirSiConcerneSection />
    </>
  );
}
