import { contentHomePage } from "@/content";
import Image from "next/image";

export default function CommentCaMarcheSection() {
  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container">
        <h2>{contentHomePage.comment_ca_marche_section.title}</h2>
        <div className="fr-grid-row fr-grid-row--gutters">
          {contentHomePage.comment_ca_marche_section.steps.map(
            (step, index) => (
              <div key={index} className="fr-col-12 fr-col-md-6 fr-col-lg-3">
                <div className="fr-tile fr-enlarge-link" id="tile-0">
                  <div className="fr-tile__body">
                    <div className="fr-tile__content">
                      <h3 className="fr-tile__title">{step.title}</h3>
                      <p className="fr-tile__desc">{step.description}</p>
                    </div>
                  </div>
                  <div className="fr-tile__header">
                    <div className="fr-tile__pictogram">
                      <Image
                        alt={step.imageAlt}
                        src={step.imageSrc}
                        height={64}
                        width={64}
                      />
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
