import content from "../content/content.json";
import Link from "next/link";

export default function EtatAgitSection() {
  return (
    <section className="fr-container-fluid fr-py-10w bg-(--background-alt-blue-france)">
      <div className="fr-container">
        <div className="fr-grid-row items-center gap-6 md:gap-0">
          {/* Zone texte */}
          <div className="fr-col-12 fr-col-md-6">
            <h2>{content.etat_agit_section.title}</h2>
            <p>{content.etat_agit_section.description_1}</p>
            <div className="fr-callout">
              <h3 className="fr-callout__title">{content.etat_agit_section.callout_title}</h3>
              <p className="fr-callout__text">{content.etat_agit_section.callout_text}</p>
            </div>
            <h6 className="fr-mt-4v">{content.etat_agit_section.description_2_title}</h6>
            <p>{content.etat_agit_section.description_2_text}</p>
            <Link className="fr-mt-4v fr-btn fr-btn--lg fr-icon-arrow-right-line fr-btn--icon-right" href="/simulateur">
              {content.etat_agit_section.cta_label}
            </Link>
          </div>

          {/* Zone tuiles */}
          <div className="fr-col-12 fr-col-md-6 flex justify-center">
            <div className="flex flex-col gap-6 p-4 md:p-20">
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
                  <div key={index} className="fr-tile fr-tile--horizontal fr-enlarge-link" id="tile-6">
                    <div className="fr-tile__body">
                      <div className="fr-tile__content">
                        <div className={`${tile.icon} fr-icon--sm mb-2 ${tile.iconColor}`}></div>
                        <h3 className="fr-tile__title">{tile.title}</h3>
                        <p className="fr-tile__desc">{tile.description}</p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
