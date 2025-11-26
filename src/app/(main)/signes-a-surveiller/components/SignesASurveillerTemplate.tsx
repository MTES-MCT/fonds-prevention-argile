import Image from "next/image";
import Link from "next/link";
import VousAvezUnDouteSection from "./VousAvezUnDouteSection";
import CalloutEligible from "./CalloutEligible";
import commonContent from "../content/common.json";
import CalloutNonEligible from "./CalloutNonElligible";

interface SignesASurveillerTemplateProps {
  title: string;
  pageLink: string;
  tag: { title: string; className: string; eligible: boolean } | undefined;
  image: { src: string; alt: string; description: string };
  ce_qu_il_faut_surveiller: string;
  signes_alerte: string[];
  conseils_pratiques: string[];
  bon_a_savoir: string;
}

export default function SignesASurveillerTemplate({
  title,
  pageLink,
  tag = { title: "", className: "", eligible: false },
  image,
  ce_qu_il_faut_surveiller,
  signes_alerte,
  conseils_pratiques,
  bon_a_savoir,
}: SignesASurveillerTemplateProps) {
  return (
    <>
      <section className="fr-container-fluid fr-py-4w">
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
              Voir le fil d'ariane
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

            <p
              className={`fr-badge ${tag.eligible ? "fr-icon-checkbox-line" : "fr-icon-warning-line"} fr-badge--icon-left ${tag.className}`}
            >
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

            {tag.eligible ? <CalloutEligible /> : <CalloutNonEligible />}

            {/* Ce qu'il faut surveiller */}
            <div className="fr-my-6w">
              <h1>{commonContent.ce_qu_il_faut_surveiller_title}</h1>
              <p>{ce_qu_il_faut_surveiller}</p>
            </div>

            {/* Signes d'alerte */}
            <div className="fr-my-6w">
              <h1>{commonContent.signes_alertes_title}</h1>
              <ul>
                {signes_alerte.map((detail, index) => (
                  <li key={index}>{detail}</li>
                ))}
              </ul>
            </div>

            {/* Conseils pratiques */}
            <div className="fr-my-6w">
              <h1>{commonContent.conseils_pratiques_title}</h1>
              <ul>
                {conseils_pratiques.map((detail, index) => (
                  <li key={index}>{detail}</li>
                ))}
              </ul>
            </div>

            {/* Bon à savoir */}
            <div className="fr-callout fr-icon-info-line">
              <h3 className="fr-callout__title">
                {commonContent.bon_a_savoir_title}
              </h3>
              <p className="fr-callout__text">{bon_a_savoir}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Vous avez un doute ? */}
      <VousAvezUnDouteSection />

      {/* Voir les autres signes à surveiller */}
      <section className="fr-container-fluid fr-py-10w">
        <div className="fr-container">
          <h1>{commonContent.signes_a_surveiller_section.title}</h1>
          <div className="fr-grid-row fr-grid-row--gutters">
            {commonContent.signes_a_surveiller_section.signes.map(
              (signe, index) =>
                signe.titre === title ? null : (
                  <div
                    key={index}
                    className="fr-col-12 fr-col-md-3 fr-col-lg-3"
                  >
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
                              className={`fr-badge ${signe.tag.eligible ? "fr-icon-checkbox-line" : "fr-icon-warning-line"} fr-badge--icon-left ${signe.tag.className}`}
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
    </>
  );
}
