import Image from "next/image";

import { Feature } from "@/components";
import { contentHomePage } from "@/content";
import { richTextParser } from "@/lib/utils";

export default function QuestCeQueLeRgaSection() {
  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container">
        {/* Zone Hero Qu'est-ce que le RGA */}
        <div className="fr-grid-row items-center gap-6 md:gap-0">
          {/* Zone image */}
          <div className="fr-col-12 fr-col-md-6 flex justify-center md:justify-start md:pr-8 lg:pr-8">
            <div className="h-[250px] md:h-[376px] relative w-full max-w-[484px]">
              <Image
                alt={contentHomePage.what_is_rga_section.image.alt}
                className="object-contain"
                fill
                priority
                quality={85}
                sizes="(max-width: 768px) 272px, (max-width: 1024px) 484px, 100vw"
                src={contentHomePage.what_is_rga_section.image.src}
              />
            </div>
          </div>

          {/* Zone texte */}
          <div className="fr-col-12 fr-col-md-6">
            <h2>{contentHomePage.what_is_rga_section.title}</h2>
            <div className="fr-callout fr-callout--pink-macaron">
              <p className="fr-callout__text fr-text--sm">
                {contentHomePage.what_is_rga_section.highlight}
              </p>
            </div>
            <p>{contentHomePage.what_is_rga_section.subtitle}</p>
            <p>
              {richTextParser(contentHomePage.what_is_rga_section.subtitle2)}
            </p>
          </div>
        </div>

        {/* Zone Icônes & Infos */}
        <div className="fr-grid-row fr-grid-row--gutters fr-mt-8w">
          <div className="fr-col-12 fr-col-sm-6 fr-col-md-3">
            <Feature
              icon="fr-icon-heavy-showers-fill"
              title="Période humide"
              description="Les sols argileux gonflent en absorbant l'eau, exerçant une pression sur les fondations."
            />
          </div>
          <div className="fr-col-12 fr-col-sm-6 fr-col-md-3">
            <Feature
              icon="fr-icon-sun-fill"
              title="Période sèche"
              description="Les sols se rétractent en perdant leur humidité, créant des mouvements de terrain."
              tileColor="bg-orange-50"
              iconColor="text-orange-500"
            />
          </div>
          <div className="fr-col-12 fr-col-sm-6 fr-col-md-3">
            <Feature
              icon="fr-icon-refresh-line"
              title="Cycles répétitifs"
              description="Ces alternances de périodes humides/sèches se répètent dans le temps fragilisant sols et fondations."
              tileColor="bg-purple-50"
              iconColor="text-purple-500"
            />
          </div>
          <div className="fr-col-12 fr-col-sm-6 fr-col-md-3">
            <Feature
              icon="fr-icon-home-4-fill"
              title="Conséquences"
              description="Fissures des murs, déformation des ouvertures, désalignement des portes et fenêtres."
              tileColor="bg-red-50"
              iconColor="text-red-600"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
