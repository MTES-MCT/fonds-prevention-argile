"use client";

import Image from "next/image";
import contentTravauxEligiblesCommon from "../../../../../(main)/travaux-eligibles/content/common.json";

/**
 * Composant affichant les travaux éligibles au Fonds RGA avec onglets par catégorie
 */
export function GagnezDuTempsTravaux() {
  return (
    <div className="fr-card fr-background-contrast--info">
      <div className="fr-p-4w">
        <div className="fr-mb-4w">
          <h3 className="fr-h5 fr-mb-1v">
            <span className="fr-icon-time-line fr-mr-2v" aria-hidden="true"></span>
            Gagnez du temps pour la prochaine étape !
          </h3>
          <p className="fr-text--sm fr-mb-0">
            Vérifiez que les travaux de votre demandeur sont éligibles au Fonds RGA.
          </p>
        </div>

        {/* Onglets */}
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
                  <div key={textIndex} className="fr-col-6 fr-col-md-6 fr-col-lg-6">
                    <div className="fr-card fr-enlarge-link fr-card--horizontal">
                      <div className="fr-card__body">
                        <div className="fr-card__content">
                          <h3 className="fr-card__title">
                            <a href={item.pageUrl} target="_blank">
                              {item.name}
                            </a>
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
    </div>
  );
}
