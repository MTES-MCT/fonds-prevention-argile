import content from "../content/content.json";
import Image from "next/image";
import Link from "next/link";

export default function EtatAgitSection() {
  return (
    <section className="fr-container-fluid fr-py-10w bg-(--background-alt-blue-france)">
      <div className="fr-container">
        <div className="fr-grid-row items-center gap-6 md:gap-0">
          {/* Zone texte */}
          <div className="fr-col-12 fr-col-md-5">
            <h2>{content.etat_agit_section.title}</h2>
            <p>{content.etat_agit_section.description_1}</p>

            <h6 className="fr-mt-4v">{content.etat_agit_section.description_2_title}</h6>
            <p>{content.etat_agit_section.description_2_text}</p>
            <Link className="fr-mt-4v fr-btn fr-btn--lg fr-icon-arrow-right-line fr-btn--icon-right" href="/simulateur">
              {content.etat_agit_section.cta_label}
            </Link>
          </div>

          {/* Zone carte des départements pilotes */}
          <div className="fr-col-12 fr-col-md-7 flex justify-center md:justify-end">
            <div className="relative w-full aspect-[4/3]">
              <Image
                alt={content.etat_agit_section.image.alt}
                className="object-contain object-right"
                fill
                priority
                quality={95}
                sizes="(max-width: 968px) 100vw, 58vw"
                src={content.etat_agit_section.image.src}
              />
            </div>
          </div>
        </div>

        {/* Tuiles d'information en bas, horizontales */}
        <div className="fr-grid-row fr-grid-row--gutters fr-mt-3w">
          {content.etat_agit_section.infos_tiles.map(
            (
              tile: {
                icon: string;
                iconColor: string;
                title: string;
                description: string;
              },
              index: number
            ) => (
              <div key={index} className="fr-col-12 fr-col-md-4">
                <div className="fr-tile fr-enlarge-link h-full">
                  <div className="fr-tile__body -mb-8">
                    <div className="fr-tile__content !items-start !text-left">
                      <div className={`${tile.icon} fr-icon--sm mb-2 ${tile.iconColor}`}></div>
                      <h3 className="fr-tile__title">{tile.title}</h3>
                      <p className="fr-tile__desc">{tile.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
