import Image from "next/image";
import Link from "next/link";
import { contentHomePage } from "@/content";
import { richTextParser } from "@/lib/utils";

export default function QuiPeutBeneficierAidesSection() {
  return (
    <section
      id="qui-peut-beneficier-aides"
      className="fr-container-fluid fr-py-10w"
    >
      <div className="fr-container">
        {/* En-tête avec titre et sous-titre */}
        <div>
          <h2 className="fr-mb-4v">
            {contentHomePage.qui_peut_beneficier_aides_section.title}
          </h2>
          <p className="fr-text--lg">
            {contentHomePage.qui_peut_beneficier_aides_section.subtitle}
          </p>
        </div>

        {/* Contenu principal avec image et liste */}
        <div className="fr-grid-row fr-grid-row--gutters">
          {/* Zone image - alignée à gauche */}
          <div className="fr-col-12 fr-col-md-6">
            <div className="relative h-[500px] lg:h-[600px] xl:h-[700px] w-full">
              <Image
                alt={
                  contentHomePage.qui_peut_beneficier_aides_section.image.alt
                }
                className="object-contain object-left"
                fill
                priority
                quality={95}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 50vw"
                src={
                  contentHomePage.qui_peut_beneficier_aides_section.image.src
                }
              />
            </div>
          </div>

          {/* Zone texte et CTA */}
          <div className="fr-col-12 fr-col-md-6 justify-items-center">
            <div className="fr-pl-0 lg:fr-pl-6w flex flex-col justify-center h-full min-h-[500px] lg:min-h-[600px] xl:min-h-[700px]">
              {/* Liste des conditions */}
              <div className="fr-mb-6w">
                {contentHomePage.qui_peut_beneficier_aides_section.text_items.map(
                  (item, index) => (
                    <div className="fr-mb-8v flex items-start" key={index}>
                      <span className="fr-icon-checkbox-circle-fill text-green-800 fr-mr-3v flex-shrink-0 mt-1" />
                      <div className="text-lg">{richTextParser(item.text)}</div>
                    </div>
                  )
                )}
              </div>

              {/* CTA */}
              <Link
                className="fr-btn fr-btn--lg fr-icon-arrow-right-line fr-btn--icon-right"
                href="/simulateur"
              >
                {contentHomePage.qui_peut_beneficier_aides_section.cta_label}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
