import { InfoTile } from "@/components";
import { contentHomePage } from "@/content";
import Link from "next/link";

export default function EtatAgitSection() {
  return (
    <section className="fr-container-fluid fr-py-10w bg-[var(--background-alt-blue-france)]">
      <div className="fr-container">
        <div className="fr-grid-row items-center gap-6 md:gap-0">
          {/* Zone texte */}
          <div className="fr-col-12 fr-col-md-6">
            <h1>{contentHomePage.etat_agit_section.title}</h1>
            <p>{contentHomePage.etat_agit_section.description_1}</p>
            <p>{contentHomePage.etat_agit_section.description_2}</p>
            <Link
              className="fr-mt-4v fr-btn fr-btn--lg fr-icon-arrow-right-line fr-btn--icon-right"
              href="/"
            >
              {contentHomePage.etat_agit_section.cta_label}
            </Link>
          </div>

          {/* Zone tuiles */}
          <div className="fr-col-12 fr-col-md-6 flex justify-center">
            <div className="flex flex-col gap-6">
              {contentHomePage.etat_agit_section.infos_tiles.map(
                (tile, index) => (
                  <InfoTile
                    key={index}
                    icon={tile.icon}
                    iconColor={tile.iconColor}
                    title={tile.title}
                    description={tile.description}
                  />
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
