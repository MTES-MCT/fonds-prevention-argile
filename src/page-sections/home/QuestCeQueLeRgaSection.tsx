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
            <figure
              role="group"
              className="fr-content-media"
              aria-label="Description / Source"
            >
              <div className="fr-content-media__img">
                <Image
                  alt={contentHomePage.what_is_rga_section.image.alt}
                  className="object-contain"
                  priority
                  quality={85}
                  width={500}
                  height={320}
                  src={contentHomePage.what_is_rga_section.image.src}
                />
              </div>
              <figcaption className="fr-content-media__caption">
                {contentHomePage.what_is_rga_section.image.caption}
              </figcaption>
            </figure>
          </div>

          {/* Zone texte */}
          <div className="fr-col-12 fr-col-md-6">
            <h2>{contentHomePage.what_is_rga_section.title}</h2>
            <div className="fr-callout fr-callout--pink-macaron">
              <p className="fr-callout__text fr-text--sm">
                {richTextParser(contentHomePage.what_is_rga_section.highlight)}
              </p>
            </div>
            <p>
              {richTextParser(contentHomePage.what_is_rga_section.subtitle)}
            </p>
            <p>
              {richTextParser(contentHomePage.what_is_rga_section.subtitle2)}
            </p>
          </div>
        </div>

        {/* Zone Icônes & Infos */}
        <div className="fr-grid-row fr-grid-row--gutters fr-mt-8w">
          <div className="fr-col-12 fr-col-sm-6 fr-col-md-2">
            <Feature
              icon="fr-icon-heavy-showers-fill"
              title="Période humide"
              description="Les sols argileux gonflent en absorbant l'eau, soulevant les fondations."
            />
          </div>
          <div className="fr-col-12 fr-col-sm-6 fr-col-md-2">
            <Feature
              icon="fr-icon-sun-fill"
              title="Période sèche"
              description="Les sols se rétractent en perdant leur humidité, entraînant un affaissement des fondations."
              tileColor="bg-orange-50"
              iconColor="text-orange-500"
            />
          </div>
          <div className="fr-col-12 fr-col-sm-6 fr-col-md-2">
            <Feature
              icon="fr-icon-refresh-line"
              title="Effets répétitifs"
              description="Ces alternances de périodes humides/sèches se répètent dans le temps fragilisant sols et fondations."
              tileColor="bg-purple-50"
              iconColor="text-purple-500"
            />
          </div>
          <div className="fr-col-12 fr-col-sm-6 fr-col-md-2">
            <Feature
              icon="fr-icon-flood-line"
              title="Causes multiples"
              description="Fuite des réseaux enterrés fuyards, défaut de drainage, Racines des arbres trop proches de la maison, absence de géomembrane, pièges à eaux."
              tileColor="bg-brown-50"
              iconColor="text-brown-500"
            />
          </div>
          <div className="fr-col-12 fr-col-sm-6 fr-col-md-2">
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
