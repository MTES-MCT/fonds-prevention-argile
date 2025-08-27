import Image from "next/image";

import wording from "@/wording";

export default function WhatIsRgaSection() {
  return (
    <section className="fr-container-fluid fr-py-10w bg-[var(--background-default-grey-hover)]">
      <div className="fr-container">
        {/* Zone Hero Qu'est-ce que le RGA */}
        <div className="fr-grid-row items-center gap-6 md:gap-0">
          {/* Zone image */}
          <div className="fr-col-12 fr-col-md-6 flex justify-center md:justify-start">
            <div className="h-[250px] md:h-[376px] relative w-full max-w-[484px]">
              <Image
                alt={wording.homepage.what_is_rga_section.image.alt}
                className="object-contain"
                fill
                priority
                quality={85}
                sizes="(max-width: 768px) 272px, (max-width: 1024px) 484px, 100vw"
                src={wording.homepage.what_is_rga_section.image.src}
              />
            </div>
          </div>

          {/* Zone texte */}
          <div className="fr-col-12 fr-col-md-6">
            <h1>{wording.homepage.what_is_rga_section.title}</h1>
            <div className="fr-callout fr-callout--pink-macaron">
              <p className="fr-callout__text fr-text--sm">
                {wording.homepage.what_is_rga_section.highlight}
              </p>
            </div>
            <p>{wording.homepage.what_is_rga_section.subtitle}</p>
          </div>
        </div>

        {/* Zone Icônes & Infos */}

        {/* Zone Signes à surveiller */}
      </div>
    </section>
  );
}
