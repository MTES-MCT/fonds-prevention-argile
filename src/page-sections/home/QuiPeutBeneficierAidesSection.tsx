import Image from "next/image";

import { contentHomePage } from "@/content";
import Link from "next/link";

export default function QuiPeutBeneficierAidesSection() {
  return (
    <section
      id="qui-peut-beneficier-aides"
      className="fr-container-fluid fr-py-10w"
    >
      <div className="fr-container">
        <h2>{contentHomePage.qui_peut_beneficier_aides_section.title}</h2>
        <p>{contentHomePage.qui_peut_beneficier_aides_section.subtitle}</p>
        <div className="fr-grid-row items-center gap-6 md:gap-0">
          {/* Zone image */}
          <div className="fr-col-12 fr-col-md-6 flex justify-center md:justify-start md:pr-8 lg:pr-8">
            <div className="h-[250px] md:h-[376px] relative w-full max-w-[484px]">
              <Image
                alt={
                  contentHomePage.qui_peut_beneficier_aides_section.image.alt
                }
                className="object-contain"
                fill
                priority
                quality={85}
                sizes="(max-width: 768px) 272px, (max-width: 1024px) 484px, 100vw"
                src={
                  contentHomePage.qui_peut_beneficier_aides_section.image.src
                }
              />
            </div>
          </div>

          {/* Zone texte */}
          <div className="fr-col-12 fr-col-md-6">
            {contentHomePage.qui_peut_beneficier_aides_section.text_items.map(
              (item, index) => (
                <div className="fr-mb-6v flex items-center gap-6" key={index}>
                  <span className="fr-icon-checkbox-circle-fill text-green-800"></span>
                  <strong>{item.text}</strong>
                </div>
              )
            )}
            <Link
              className="fr-mt-4v fr-btn fr-btn--lg fr-icon-arrow-right-line fr-btn--icon-right"
              href="/simulateur"
            >
              {contentHomePage.hero_section.cta_label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
