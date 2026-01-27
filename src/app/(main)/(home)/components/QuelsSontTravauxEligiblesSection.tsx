import content from "../content/content.json";
import contentTravauxEligiblesCommon from "../../travaux-eligibles/content/common.json";
import Image from "next/image";

export default function QuelsSontTravauxEligiblesSection() {
  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container">
        <h2>{content.quels_sont_travaux_eligibles_section.title}</h2>
        <div className="fr-tabs">
          <ul className="fr-tabs__list" role="tablist" aria-label="">
            {contentTravauxEligiblesCommon.autres_travaux_section.travaux_tabs.map((tab, index) => (
              <li key={index} role="presentation">
                <button
                  type="button"
                  id={`tab-${index}`}
                  className={`fr-tabs__tab ${tab.icon} fr-tabs__tab--icon-left`}
                  tabIndex={index === 0 ? 0 : -1}
                  role="tab"
                  aria-selected={index === 0 ? "true" : "false"}
                  aria-controls={`tab-${index}-panel`}>
                  {tab.title}
                </button>
              </li>
            ))}
          </ul>
          {contentTravauxEligiblesCommon.autres_travaux_section.travaux_tabs.map((tab, index) => (
            <div
              id={`tab-${index}-panel`}
              key={index}
              className={`fr-tabs__panel ${index === 0 ? "fr-tabs__panel--selected" : ""}`}
              role="tabpanel"
              aria-labelledby={`tab-${index}`}
              tabIndex={0}>
              {/* Grille pour organiser les cartes */}
              <div className="fr-grid-row fr-grid-row--gutters">
                {tab.travaux.map((item, textIndex) => (
                  <div key={textIndex} className="fr-col-12 fr-col-md-6 fr-col-lg-4">
                    <div className="fr-card fr-enlarge-link fr-card--horizontal">
                      <div className="fr-card__body">
                        <div className="fr-card__content">
                          <h3 className="fr-card__title">
                            <a href={item.pageUrl}>{item.name}</a>
                          </h3>
                          <div className="fr-card__start"></div>
                        </div>
                      </div>
                      <div className="fr-card__header">
                        <div className="fr-card__img">
                          <Image
                            className="fr-responsive-img"
                            src={item.image.src}
                            alt={item.image.alt}
                            width={300}
                            height={200}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
