import { contentTravauxEligibles } from "@/content";
import Image from "next/image";
import Link from "next/link";

export default function MiseEnChargeReseauxEaux() {
  return (
    <>
      <section className="fr-container-fluid fr-py-10w">
        <div className="fr-container [&_h2]:text-[var(--text-title-grey)]! [&_h2]:mt-10!">
          <nav
            role="navigation"
            className="fr-breadcrumb"
            aria-label="vous êtes ici :"
          >
            <button
              type="button"
              className="fr-breadcrumb__button"
              aria-expanded="false"
              aria-controls="breadcrumb"
            >
              Voir le fil d&#39;arianne
            </button>
            <div className="fr-collapse" id="breadcrumb">
              <ol className="fr-breadcrumb__list">
                <li>
                  <Link
                    className="fr-breadcrumb__link"
                    id="segment-0"
                    href="/#"
                  >
                    Accueil
                  </Link>
                </li>
                <li>
                  <a
                    className="fr-breadcrumb__link"
                    id="segment-1"
                    aria-current="page"
                    href="/travaux-eligibles/mise-en-charge-reseaux-eaux"
                  >
                    {contentTravauxEligibles.miseEnChargeReseauEaux.title}
                  </a>
                </li>
              </ol>
            </div>
          </nav>
          <div className="container">
            <h1>{contentTravauxEligibles.miseEnChargeReseauEaux.title}</h1>

            <p className="fr-badge fr-icon-checkbox-line fr-badge--icon-left">
              {contentTravauxEligibles.miseEnChargeReseauEaux.tag.title}
            </p>

            {/* Image */}
            <figure
              role="group"
              className="fr-content-media"
              aria-label="Description / Source"
            >
              <div className="fr-content-media__img">
                <Image
                  className="fr-responsive-img fr-ratio-32x9"
                  src={contentTravauxEligibles.miseEnChargeReseauEaux.image.src}
                  alt={contentTravauxEligibles.miseEnChargeReseauEaux.image.alt}
                  quality={95}
                  width={564}
                  height={318}
                />
              </div>
              <figcaption className="fr-content-media__caption">
                {
                  contentTravauxEligibles.miseEnChargeReseauEaux.image
                    .description
                }
              </figcaption>
            </figure>

            {/* Une des solutions pour protéger votre maison */}
            <div className="fr-my-6w">
              <h1>
                {
                  contentTravauxEligibles.miseEnChargeReseauEaux
                    .une_des_solutions.title
                }
              </h1>
              <p>
                {
                  contentTravauxEligibles.miseEnChargeReseauEaux
                    .une_des_solutions.description
                }
              </p>
            </div>

            {/* En quoi consiste cette solution ? */}
            <div className="fr-my-6w">
              <h1>
                {
                  contentTravauxEligibles.miseEnChargeReseauEaux
                    .en_quoi_consiste_solution.title
                }
              </h1>
              <h4>
                {
                  contentTravauxEligibles.miseEnChargeReseauEaux
                    .en_quoi_consiste_solution.ameliorations.title
                }
              </h4>
              <ul>
                {contentTravauxEligibles.miseEnChargeReseauEaux.en_quoi_consiste_solution.ameliorations.details.map(
                  (detail, index) => (
                    <li key={index}>{detail}</li>
                  )
                )}
              </ul>
              <h4>
                {
                  contentTravauxEligibles.miseEnChargeReseauEaux
                    .en_quoi_consiste_solution.gestion_eaux.title
                }
              </h4>
              <ul>
                {contentTravauxEligibles.miseEnChargeReseauEaux.en_quoi_consiste_solution.gestion_eaux.details.map(
                  (detail, index) => (
                    <li key={index}>{detail}</li>
                  )
                )}
              </ul>
            </div>

            {/* Pourquoi cette solution est efficace */}
            <div className="fr-my-6w">
              <h1>
                {
                  contentTravauxEligibles.miseEnChargeReseauEaux
                    .pourquoi_solution_efficace.title
                }
              </h1>
              <p>
                {
                  contentTravauxEligibles.miseEnChargeReseauEaux
                    .pourquoi_solution_efficace.subtitle
                }
              </p>
              <ul>
                {contentTravauxEligibles.miseEnChargeReseauEaux.pourquoi_solution_efficace.details.map(
                  (detail, index) => (
                    <li key={index}>{detail}</li>
                  )
                )}
              </ul>
            </div>

            {/* Quand mettre en oeuvre la solution */}
            <div className="fr-my-6w">
              <h1>
                {
                  contentTravauxEligibles.miseEnChargeReseauEaux
                    .quand_mettre_en_oeuvre.title
                }
              </h1>
              <h4>
                {
                  contentTravauxEligibles.miseEnChargeReseauEaux
                    .quand_mettre_en_oeuvre.prevention.title
                }
              </h4>
              <ul>
                {contentTravauxEligibles.miseEnChargeReseauEaux.quand_mettre_en_oeuvre.prevention.details.map(
                  (detail, index) => (
                    <li key={index}>{detail}</li>
                  )
                )}
              </ul>
              <h4>
                {
                  contentTravauxEligibles.miseEnChargeReseauEaux
                    .quand_mettre_en_oeuvre.traitement.title
                }
              </h4>
              <ul>
                {contentTravauxEligibles.miseEnChargeReseauEaux.quand_mettre_en_oeuvre.traitement.details.map(
                  (detail, index) => (
                    <li key={index}>{detail}</li>
                  )
                )}
              </ul>
            </div>

            {/* Bon à savoir */}
            <div className="fr-callout fr-icon-info-line">
              <h3 className="fr-callout__title">
                {contentTravauxEligibles.miseEnChargeReseauEaux.a_retenir.title}
              </h3>
              <p className="fr-callout__text">
                {
                  contentTravauxEligibles.miseEnChargeReseauEaux.a_retenir
                    .description
                }
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section Lancez-vous  */}
      <section className="fr-container-fluid fr-py-10w bg-[var(--background-alt-blue-france)]">
        <div className="fr-container">
          <div className="fr-grid-row items-center gap-6 md:gap-0">
            {/* Zone texte */}
            <div className="fr-col-12 fr-col-md-6">
              <h2 className="text-left">
                {
                  contentTravauxEligibles.miseEnChargeReseauEaux
                    .lancez_vous_section.title
                }
              </h2>
              <h2 className="text-left">
                {
                  contentTravauxEligibles.miseEnChargeReseauEaux
                    .lancez_vous_section.title2
                }
              </h2>

              <Link
                className="fr-mt-4v fr-btn fr-btn--lg fr-icon-arrow-right-line fr-btn--icon-right"
                href={
                  contentTravauxEligibles.miseEnChargeReseauEaux
                    .lancez_vous_section.cta_link
                }
              >
                {
                  contentTravauxEligibles.miseEnChargeReseauEaux
                    .lancez_vous_section.cta_label
                }
              </Link>
            </div>

            {/* Zone image */}
            <div className="fr-col-12 fr-col-md-6 flex justify-center md:justify-end">
              <div className="h-[250px] md:h-[376px] relative w-full max-w-[484px]">
                <Image
                  alt={
                    contentTravauxEligibles.miseEnChargeReseauEaux
                      .lancez_vous_section.image.alt
                  }
                  className="object-contain"
                  fill
                  priority
                  quality={85}
                  sizes="(max-width: 768px) 272px, (max-width: 1024px) 484px, 100vw"
                  src={
                    contentTravauxEligibles.miseEnChargeReseauEaux
                      .lancez_vous_section.image.src
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Autres travaux */}
      <section className="fr-container-fluid fr-py-10w">
        <div className="fr-container">
          <h2>
            {
              contentTravauxEligibles.miseEnChargeReseauEaux.autres_travaux
                .title
            }
          </h2>
          <div className="fr-tabs">
            <ul className="fr-tabs__list" role="tablist" aria-label="">
              {contentTravauxEligibles.miseEnChargeReseauEaux.autres_travaux.tabs.map(
                (tab, index) => (
                  <li key={index} role="presentation">
                    <button
                      type="button"
                      id={`tab-${index}`}
                      className={`fr-tabs__tab ${tab.icon} fr-tabs__tab--icon-left`}
                      tabIndex={index === 0 ? 0 : -1}
                      role="tab"
                      aria-selected={index === 0 ? "true" : "false"}
                      aria-controls={`tab-${index}-panel`}
                    >
                      {tab.title}
                    </button>
                  </li>
                )
              )}
            </ul>
            {contentTravauxEligibles.miseEnChargeReseauEaux.autres_travaux.tabs.map(
              (tab, index) => (
                <div
                  id={`tab-${index}-panel`}
                  key={index}
                  className={`fr-tabs__panel ${index === 0 ? "fr-tabs__panel--selected" : ""}`}
                  role="tabpanel"
                  aria-labelledby={`tab-${index}`}
                  tabIndex={0}
                >
                  <div className="fr-grid-row fr-grid-row--gutters">
                    {tab.travaux.map((item, textIndex) => (
                      <div
                        key={textIndex}
                        className="fr-col-12 fr-col-md-6 fr-col-lg-4"
                      >
                        <div className="fr-card fr-enlarge-link fr-card--horizontal">
                          <div className="fr-card__body">
                            <div className="fr-card__content">
                              <h3 className="fr-card__title">
                                <a href={item.pageUrl}>{item.text}</a>
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
              )
            )}
          </div>
        </div>
      </section>
    </>
  );
}
