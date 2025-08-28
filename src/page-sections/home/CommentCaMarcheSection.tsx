import { IllustrationTile } from "@/components";
import { contentHomePage } from "@/content";

export default function CommentCaMarcheSection() {
  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container">
        <h1>{contentHomePage.comment_ca_marche_section.title}</h1>
        <div className="fr-grid-row fr-grid-row--gutters">
          {contentHomePage.comment_ca_marche_section.steps.map(
            (step, index) => (
              <div key={index} className="fr-col-12 fr-col-md-6 fr-col-lg-4">
                <IllustrationTile
                  title={step.title}
                  description={step.description}
                  imageAlt={step.imageAlt}
                  imageSrc={step.imageSrc}
                  imageHeight={64}
                  imageWidth={64}
                />
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
