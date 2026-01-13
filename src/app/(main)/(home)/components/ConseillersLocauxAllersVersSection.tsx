import Link from "next/link";
import content from "../content/content.json";
import Image from "next/image";

export default function ConseillersLocauxAllersVersSection() {
  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container">
        <div className="fr-grid-row items-center gap-6 md:gap-0">
          {/* Zone texte */}
          <div className="fr-col-12 fr-col-md-6">
            <h2 className="text-left">{content.conseillersLocaux_allers_vers_section.title}</h2>
            <p>{content.conseillersLocaux_allers_vers_section.description}</p>
            <p>{content.conseillersLocaux_allers_vers_section.description2}</p>
            <p>{content.conseillersLocaux_allers_vers_section.description3}</p>
            <p>{content.conseillersLocaux_allers_vers_section.description4}</p>
            <Link
              className="fr-mt-4v fr-btn fr-btn--secondary"
              href={content.conseillersLocaux_allers_vers_section.cta_url}>
              {content.conseillersLocaux_allers_vers_section.cta_label}
            </Link>
          </div>

          {/* Zone image */}
          <div className="fr-col-12 fr-col-md-6 flex justify-center md:justify-end">
            <div className="relative w-full max-w-[729px] aspect-[640/495]">
              <Image
                alt={content.conseillersLocaux_allers_vers_section.image.alt}
                className="object-contain"
                fill
                priority
                quality={85}
                sizes="(max-width: 768px) 100vw, 484px"
                src={content.conseillersLocaux_allers_vers_section.image.src}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
