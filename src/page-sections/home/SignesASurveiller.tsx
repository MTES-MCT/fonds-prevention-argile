import { contentHomePage } from "@/content";
import { contentSignesASurveillerCommon } from "@/content/signes-a-surveiller";
import Image from "next/image";

export default function SignesASurveiller() {
  const signesEligibles = contentSignesASurveillerCommon.signes_a_surveiller_section.signes.filter(
    (signe) => signe.eligible === true
  );
  const signesNonEligibles = contentSignesASurveillerCommon.signes_a_surveiller_section.signes.filter(
    (signe) => signe.eligible === false
  );

  return (
    {/* Container 1 : Signes  éligibles */}
    <section className="fr-container-fluid fr-py-10w bg-[var(--background-alt-grey)]">
      <div className="fr-container">
        <h2>{contentHomePage.signes_a_surveiller_section.title}</h2>
        <p>{contentHomePage.signes_a_surveiller_section.subtitle}</p>
        <p>{contentHomePage.signes_a_surveiller_section.subtitle2}</p>
        <div className="fr-grid-row fr-grid-row--gutters">
          {signesEligibles.map((signe, index) => (
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


    {/* Container 2 : Signes non éligibles */}
    <section className="fr-container-fluid fr-py-10w bg-[var(--background-alt-grey)]">
      <div className="fr-container">
        <h2>{contentHomePage.desordres_structuraux_section.title}</h2>
        <p>{contentHomePage.desordres_structuraux_section.subtitle}</p>
        <div className="fr-grid-row fr-grid-row--gutters">
          {signesNonEligibles.map((signe, index) => (
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
