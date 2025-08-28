import Image from "next/image";

import { Feature } from "@/components";
import { contentHomePage } from "@/content";

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
            <h1>{contentHomePage.what_is_rga_section.title}</h1>
            <div className="fr-callout fr-callout--pink-macaron">
              <p className="fr-callout__text fr-text--sm">
                {contentHomePage.what_is_rga_section.highlight}
              </p>
            </div>
            <p>{contentHomePage.what_is_rga_section.subtitle}</p>
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
              description="Ces alternances humides/sèches se répètent dans le temps fragilisant sols et fondations."
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

        {/* Zone Signes à surveiller */}
        <div className="container fr-mt-8w">
          <h1>Les signes à surveiller</h1>
          <div className="fr-grid-row fr-grid-row--gutters">
            <div className="fr-col-12 fr-col-md-4 fr-col-lg-3">
              <div className="fr-tile" id="tile-10">
                <div className="fr-tile__body">
                  <div className="fr-tile__content">
                    <h6 className="fr-tile__title" style={{ fontSize: "16px" }}>
                      Fissures en escalier sur les murs extérieurs
                    </h6>
                  </div>
                </div>
              </div>
            </div>

            <div className="fr-col-12 fr-col-md-4 fr-col-lg-3">
              <div className="fr-tile" id="tile-10">
                <div className="fr-tile__body">
                  <div className="fr-tile__content">
                    <h6 className="fr-tile__title" style={{ fontSize: "16px" }}>
                      Fissures horizontales le long des plinthes
                    </h6>
                  </div>
                </div>
              </div>
            </div>

            <div className="fr-col-12 fr-col-md-4 fr-col-lg-3">
              <div className="fr-tile" id="tile-10">
                <div className="fr-tile__body">
                  <div className="fr-tile__content">
                    <h6 className="fr-tile__title" style={{ fontSize: "16px" }}>
                      Portes et fenêtre qui ferment mal
                    </h6>
                  </div>
                </div>
              </div>
            </div>

            <div className="fr-col-12 fr-col-md-4 fr-col-lg-3">
              <div className="fr-tile" id="tile-10">
                <div className="fr-tile__body">
                  <div className="fr-tile__content">
                    <h6 className="fr-tile__title" style={{ fontSize: "16px" }}>
                      Décollements entre la cloison et le plafond
                    </h6>
                  </div>
                </div>
              </div>
            </div>

            <div className="fr-col-12 fr-col-md-4 fr-col-lg-3">
              <div className="fr-tile" id="tile-10">
                <div className="fr-tile__body">
                  <div className="fr-tile__content">
                    <h6 className="fr-tile__title" style={{ fontSize: "16px" }}>
                      Affaissement ou soulèvement de dallages
                    </h6>
                  </div>
                </div>
              </div>
            </div>

            <div className="fr-col-12 fr-col-md-4 fr-col-lg-3">
              <div className="fr-tile" id="tile-10">
                <div className="fr-tile__body">
                  <div className="fr-tile__content">
                    <h6 className="fr-tile__title" style={{ fontSize: "16px" }}>
                      Fissures dans les cloisons intérieures
                    </h6>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
