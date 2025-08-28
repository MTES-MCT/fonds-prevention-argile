import { contentHomePage } from "@/content";
import Image from "next/image";

export default function QuiSommesNousSection() {
  return (
    <section className="fr-container-fluid fr-py-10w bg-[var(--background-alt-blue-france)]">
      <div className="fr-container">
        <div className="fr-grid-row fr-grid-row--gutters fr-grid-row--center">
          {/* Zone gauche - Qui sommes nous */}
          <div className="fr-col-12 fr-col-lg-6 fr-col--stretch">
            <div className="bg-white shadow-md p-10 h-full flex flex-col">
              <h4>
                {
                  contentHomePage.qui_sommes_nous_section
                    .qui_sommes_nous_subsection.title
                }
              </h4>
              <p className="text-sm fr-text--light leading-tight">
                {
                  contentHomePage.qui_sommes_nous_section
                    .qui_sommes_nous_subsection.description_1
                }
              </p>
              <p className="text-sm fr-text--light leading-tight">
                {
                  contentHomePage.qui_sommes_nous_section
                    .qui_sommes_nous_subsection.description_2
                }
              </p>
              <div className="mt-auto flex justify-start">
                <Image
                  src={
                    contentHomePage.qui_sommes_nous_section
                      .qui_sommes_nous_subsection.imageSrc
                  }
                  alt={
                    contentHomePage.qui_sommes_nous_section
                      .qui_sommes_nous_subsection.imageAlt
                  }
                  width={300}
                  height={300}
                />
              </div>
            </div>
          </div>

          {/* Zone droite - Nos missions */}
          <div className="fr-col-12 fr-col-lg-6 fr-col--stretch">
            <div className="bg-white shadow-md p-10 h-full flex flex-col">
              <h4>
                {
                  contentHomePage.qui_sommes_nous_section
                    .nos_missions_subsection.title
                }
              </h4>
              <div className="flex-grow">
                {contentHomePage.qui_sommes_nous_section.nos_missions_subsection.missions.map(
                  (mission, index) => (
                    <div key={index} className="mb-4">
                      <div className="fr-text--lg font-black	fr-mb-1v">
                        <span
                          className={`text-blue-900 font-extrabold text-xl mr-2 ${mission.icon}`}
                          aria-hidden="true"
                        ></span>
                        {mission.title}
                      </div>
                      <p className="text-sm font-extralight leading-tight fr-mb-0">
                        {mission.description}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
