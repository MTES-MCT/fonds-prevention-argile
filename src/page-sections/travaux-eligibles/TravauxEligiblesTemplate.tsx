import Image from "next/image";
import Link from "next/link";
import { contentLayout } from "@/content";
import LancezVousSection from "./LancezVousSection";
import { contentTravauxEligiblesCommon } from "@/content/travaux-eligibles";

interface TravauxEligiblesTemplateProps {
  title: string;
  pageLink: string;
  tag: { title: string; className: string; icon?: string } | undefined;
  image: { src: string; alt: string; description: string };
  une_des_solutions: string;
  une_des_solutions2: string;
  solutions: { title: string; details: string[] }[];
  pourquoi_solution_efficace: { subtitle: string; details: string[] };
  quand_mettre_en_oeuvre: {
    prevention: { title: string; details: string[] };
    traitement: { title: string; details: string[] };
    generalite: string;
  };
  a_retenir: string;
  a_retenir2: string;
}

export default function TravauxEligiblesTemplate({
  title,
  pageLink,
  tag = { title: "", className: "", icon: "" },
  image,
  une_des_solutions,
  une_des_solutions2,
  solutions,
  pourquoi_solution_efficace = { subtitle: "", details: [] },
  quand_mettre_en_oeuvre,
  a_retenir,
  a_retenir2,
}: TravauxEligiblesTemplateProps) {
  return (
    <>
      <section className="fr-container-fluid fr-py-4w">
        <div className="fr-container [&_h2]:text-[var(--text-title-grey)]! [&_h2]:mt-4!">
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
              {contentLayout.breadcrumb.filAriane}
            </button>
            <div className="fr-collapse" id="breadcrumb">
              <ol className="fr-breadcrumb__list">
                <li>
                  <Link
                    className="fr-breadcrumb__link"
                    id="segment-0"
                    href="/#"
                  >
                    {contentLayout.breadcrumb.home}
                  </Link>
                </li>
                <li>
                  <a
                    className="fr-breadcrumb__link"
                    id="segment-1"
                    aria-current="page"
                    href={pageLink}
                  >
                    {title}
                  </a>
                </li>
              </ol>
            </div>
          </nav>
          <div className="container">
            <h1>{title}</h1>

            <p className={`fr-badge ${tag.icon} fr-badge--icon-left`}>
              {tag.title}
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
                  src={image.src}
                  alt={image.alt}
                  quality={95}
                  width={564}
                  height={318}
                />
              </div>
              <figcaption className="fr-content-media__caption">
                {image.description}
              </figcaption>
            </figure>

            {/* Une des solutions pour protéger votre maison */}
            <div className="fr-my-6w">
              <h1>{contentTravauxEligiblesCommon.une_des_solutions_title}</h1>
              <p>{une_des_solutions}</p>
              {une_des_solutions2 && <p>{une_des_solutions2}</p>}
            </div>

            {/* En quoi consiste cette solution ? */}
            <div className="fr-my-6w">
              <h1>
                {contentTravauxEligiblesCommon.en_quoi_consiste_solution_title}
              </h1>
              {solutions.map((solution, index) => (
                <div key={index}>
                  <h4 key={index}>{solution.title}</h4>
                  <ul>
                    {solution.details.map((detail, detailIndex) => (
                      <li key={detailIndex}>{detail}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Pourquoi cette solution est efficace */}
            <div className="fr-my-6w">
              <h1>
                {contentTravauxEligiblesCommon.pourquoi_solution_efficace_title}
              </h1>
              <p>{pourquoi_solution_efficace.subtitle}</p>
              <ul>
                {pourquoi_solution_efficace.details.map((detail, index) => (
                  <li key={index}>{detail}</li>
                ))}
              </ul>
            </div>

            {/* Quand mettre en oeuvre la solution */}
            <div className="fr-my-6w">
              <h1>
                {contentTravauxEligiblesCommon.quand_mettre_en_oeuvre_title}
              </h1>

              {quand_mettre_en_oeuvre.generalite && <p>{quand_mettre_en_oeuvre.generalite}</p>}
              <h4>{quand_mettre_en_oeuvre.prevention.title}</h4>
              <ul>
                {quand_mettre_en_oeuvre.prevention.details.map(
                  (detail, index) => (
                    <li key={index}>{detail}</li>
                  )
                )}
              </ul>
              <h4>{quand_mettre_en_oeuvre.traitement.title}</h4>
              <ul>
                {quand_mettre_en_oeuvre.traitement.details.map(
                  (detail, index) => (
                    <li key={index}>{detail}</li>
                  )
                )}
              </ul>

            </div>

            {/* A retenir */}
            <div className="fr-callout fr-icon-info-line">
              <h3 className="fr-callout__title">
                {contentTravauxEligiblesCommon.a_retenir_title}
              </h3>
              <p className="fr-callout__text">{a_retenir}</p>
              {a_retenir2 && <p className="fr-callout__text">{a_retenir2}</p>}
            </div>
          </div>
        </div>
      </section>

      {/* Section Lancez-vous  */}
      <LancezVousSection />

      {/* Autres travaux */}
      <section className="fr-container-fluid fr-py-10w">
        <div className="fr-container">
          <h2>{contentTravauxEligiblesCommon.autres_travaux_section.title}</h2>
          <div className="fr-tabs">
            <ul className="fr-tabs__list" role="tablist" aria-label="">
              {contentTravauxEligiblesCommon.autres_travaux_section.travaux_tabs.map(
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
            {contentTravauxEligiblesCommon.autres_travaux_section.travaux_tabs.map(
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
                    {tab.travaux.map((item, textIndex) =>
                      item.name === title ? null : (
                        <div
                          key={textIndex}
                          className="fr-col-12 fr-col-md-6 fr-col-lg-4"
                        >
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
                      )
                    )}
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
