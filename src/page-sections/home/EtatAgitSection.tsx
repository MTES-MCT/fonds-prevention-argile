import Image from "next/image";

import { InfoTile, Link } from "@/components";
import wording from "@/wording";

export default function EtatAgitSection() {
  return (
    <section className="fr-container-fluid fr-py-10w bg-[var(--background-alt-blue-france)]">
      <div className="fr-container">
        <div className="fr-grid-row items-center gap-6 md:gap-0">
          {/* Zone texte */}
          <div className="fr-col-12 fr-col-md-6">
            <h1>{wording.homepage.etat_agit_section.title}</h1>
            <p>{wording.homepage.etat_agit_section.description_1}</p>
            <p>{wording.homepage.etat_agit_section.description_2}</p>
            <Link {...wording.homepage.check_eligibility} />
          </div>

          {/* Zone tuiles */}
          <div className="fr-col-12 fr-col-md-6 flex justify-end md:justify-end">
            <div className="flex flex-col gap-6">
              {wording.homepage.etat_agit_section.infos_tiles.map(
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
