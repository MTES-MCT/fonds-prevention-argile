import { contentHomePage } from "@/content";
import { contentSignesASurveillerCommon } from "@/content/signes-a-surveiller";
import Image from "next/image";
import CalloutEligible from "../signes-a-surveiller/CalloutEligible";
import CalloutNonEligible from "../signes-a-surveiller/CalloutNonElligible";

export default function SignesASurveiller() {
  return (
    <section className="fr-container-fluid fr-py-10w bg-[var(--background-alt-grey)]">
      {/* Signes pris en charge */}
      {/*<div className="fr-container fr-mb-4w">
        <h2>
          {contentHomePage.signes_a_surveiller_section.pris_en_charge.title}
        </h2>
        <p>
          {contentHomePage.signes_a_surveiller_section.pris_en_charge.subtitle}
        </p>
        <p>
          {contentHomePage.signes_a_surveiller_section.pris_en_charge.subtitle2}
        </p>
        <CalloutEligible />
        <div className="fr-grid-row fr-grid-row--gutters">
          {contentSignesASurveillerCommon.signes_a_surveiller_section.signes
            .filter((signe) => signe.priseEnCharge)
            .map((signe, index) => (
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
            ))}
        </div>
      </div>*/}

      {/*  Signes non pris en charge */}
      <div className="fr-container fr-mt-8w">
        <h2>
          {contentHomePage.signes_a_surveiller_section.non_pris_en_charge.title}
        </h2>
        <p>
          {
            {richTextParser(contentHomePage.signes_a_surveiller_section.non_pris_en_charge
              .subtitle)}
          }
        </p>
        <p>
          {
            {richTextParser(contentHomePage.signes_a_surveiller_section.non_pris_en_charge
              .subtitle2)}
          }
        </p>
        <CalloutNonEligible />
        <div className="fr-grid-row fr-grid-row--gutters">
          {contentSignesASurveillerCommon.signes_a_surveiller_section.signes
            .filter((signe) => !signe.priseEnCharge)
            .map((signe, index) => (
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
                          className={`fr-badge fr-icon-warning-line fr-badge--icon-left ${signe.tag.className}`}
                        >
                          {signe.tag.title}
                        </p>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </section>
  );
}
