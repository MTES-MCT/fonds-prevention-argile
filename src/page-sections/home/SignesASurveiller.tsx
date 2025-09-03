import { contentHomePage } from "@/content";
import Image from "next/image";

export default function SignesASurveiller() {
  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container">
        <h1>{contentHomePage.signes_a_surveiller_section.title}</h1>
        <div className="fr-grid-row fr-grid-row--gutters">
          {contentHomePage.signes_a_surveiller_section.signes.map(
            (signe, index) => (
              <div key={index} className="fr-col-12 fr-col-md-3 fr-col-lg-3">
                <div className="fr-card fr-enlarge-link">
                  <div className="fr-card__body">
                    <div className="fr-card__content">
                      <h3 className="fr-card__title">
                        <a href={signe.pageLink}>{signe.titre}</a>
                      </h3>
                      <p className="fr-card__desc">{signe.description}</p>
                    </div>
                  </div>
                  <div className="fr-card__header">
                    <div className="fr-card__img">
                      <Image
                        className="fr-responsive-img"
                        alt=""
                        src={signe.imageSrc}
                        width={300}
                        height={300}
                      />
                    </div>
                    <ul className="fr-badges-group">
                      <li>
                        <p
                          className={`fr-badge fr-icon-checkbox-line fr-badge--icon-left ${signe.tag.className}`}
                        >
                          {signe.tag.title}
                        </p>
                      </li>
                    </ul>
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
