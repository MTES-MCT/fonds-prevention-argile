import content from "../content/content.json";
import Image from "next/image";

import Link from "next/link";

export default function LogementConcerneRgaSection() {
  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container">
        <div className="fr-grid-row items-center gap-6 md:gap-0">
          {/* Zone texte */}
          <div className="fr-col-12 fr-col-md-6">
            <h2 className="text-left">
              {content.logement_concerne_section.title}
            </h2>
            <p>{content.logement_concerne_section.subtitle}</p>
            <Link
              className="fr-mt-4v fr-btn fr-btn--lg fr-icon-arrow-right-line fr-btn--icon-right"
              href={content.logement_concerne_section.cta_url}
            >
              {content.logement_concerne_section.cta_label}
            </Link>
            <div className="fr-mt-4v">
              <a
                href="#qui-peut-beneficier-aides"
                className=" underline text-sm md:text-base"
              >
                {content.logement_concerne_section.voir_critere_label}
              </a>
            </div>
          </div>

          {/* Zone image */}
          <div className="fr-col-12 fr-col-md-6 flex justify-center md:justify-end">
            <div className="h-[250px] md:h-[376px] relative w-full max-w-[484px]">
              <Image
                alt={content.logement_concerne_section.image.alt}
                className="object-contain"
                fill
                priority
                quality={85}
                sizes="(max-width: 768px) 272px, (max-width: 1024px) 484px, 100vw"
                src={content.logement_concerne_section.image.src}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
