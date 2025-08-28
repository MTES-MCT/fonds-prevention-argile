import { contentHomePage } from "@/content";
import Image from "next/image";

import Link from "next/link";

export default function LogementConcerneRgaSection() {
  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container">
        <div className="fr-grid-row items-center gap-6 md:gap-0">
          {/* Zone texte */}
          <div className="fr-col-12 fr-col-md-6">
            <h1>{contentHomePage.hero_section.title}</h1>
            <p>{contentHomePage.hero_section.subtitle}</p>
            <Link
              className="fr-mt-4v fr-btn fr-btn--lg fr-icon-arrow-right-line fr-btn--icon-right"
              href="/simulateur"
            >
              {contentHomePage.hero_section.cta_label}
            </Link>
          </div>

          {/* Zone image */}
          <div className="fr-col-12 fr-col-md-6 flex justify-center md:justify-end">
            <div className="h-[250px] md:h-[376px] relative w-full max-w-[484px]">
              <Image
                alt={contentHomePage.hero_section.image.alt}
                className="object-contain"
                fill
                priority
                quality={85}
                sizes="(max-width: 768px) 272px, (max-width: 1024px) 484px, 100vw"
                src={contentHomePage.hero_section.image.src}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
