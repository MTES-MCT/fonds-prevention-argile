import { contentSignesASurveiller } from "@/content";
import Image from "next/image";
import Link from "next/link";

export default function FissuresEnEscalier() {
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
                  <a className="fr-breadcrumb__link" id="segment-0" href="/#">
                    Accueil
                  </a>
                </li>
                <li>
                  <a
                    className="fr-breadcrumb__link"
                    id="segment-1"
                    aria-current="page"
                    href="/signes-a-surveiller/fissures-en-escalier"
                  >
                    {contentSignesASurveiller.fissuresEscalier.title}
                  </a>
                </li>
              </ol>
            </div>
          </nav>
          <div className="container">
            <h1>{contentSignesASurveiller.fissuresEscalier.title}</h1>

            <p className="fr-badge fr-icon-checkbox-line fr-badge--icon-left fr-badge--orange-terre-battue">
              {contentSignesASurveiller.fissuresEscalier.tag.title}
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
                  src={contentSignesASurveiller.fissuresEscalier.image.src}
                  alt={contentSignesASurveiller.fissuresEscalier.image.alt}
                  quality={95}
                  width={564}
                  height={318}
                />
              </div>
              <figcaption className="fr-content-media__caption">
                {contentSignesASurveiller.fissuresEscalier.image.description}
              </figcaption>
            </figure>

            {/* Ce qu'il faut surveiller */}
            <div className="fr-my-6w">
              <h1>
                {
                  contentSignesASurveiller.fissuresEscalier
                    .ce_quil_faut_surveiller.title
                }
              </h1>
              <p>
                {
                  contentSignesASurveiller.fissuresEscalier
                    .ce_quil_faut_surveiller.description
                }
              </p>
            </div>

            {/* Signes d'alerte */}
            <div className="fr-my-6w">
              <h1>
                {contentSignesASurveiller.fissuresEscalier.signes_alertes.title}
              </h1>
              <ul>
                {contentSignesASurveiller.fissuresEscalier.signes_alertes.details.map(
                  (detail, index) => (
                    <li key={index}>{detail}</li>
                  )
                )}
              </ul>
            </div>

            {/* Conseils pratiques */}
            <div className="fr-my-6w">
              <h1>
                {
                  contentSignesASurveiller.fissuresEscalier.conseils_pratiques
                    .title
                }
              </h1>
              <ul>
                {contentSignesASurveiller.fissuresEscalier.conseils_pratiques.details.map(
                  (detail, index) => (
                    <li key={index}>{detail}</li>
                  )
                )}
              </ul>
            </div>

            {/* Bon à savoir */}
            <div className="fr-callout fr-icon-info-line">
              <h3 className="fr-callout__title">
                {contentSignesASurveiller.fissuresEscalier.bon_a_savoir.title}
              </h3>
              <p className="fr-callout__text">
                {
                  contentSignesASurveiller.fissuresEscalier.bon_a_savoir
                    .description
                }
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Vous avez un doute ? */}
      <section className="fr-container-fluid fr-py-10w bg-[var(--background-alt-blue-france)]">
        <div className="fr-container">
          <div className="fr-grid-row items-center gap-6 md:gap-0">
            {/* Zone texte */}
            <div className="fr-col-12 fr-col-md-6">
              <h2 className="text-left">
                {contentSignesASurveiller.fissuresEscalier.doute_section.title}
              </h2>
              <h2 className="text-left">
                {contentSignesASurveiller.fissuresEscalier.doute_section.title2}
              </h2>
              <h2 className="text-left text-blue-900 ">
                {contentSignesASurveiller.fissuresEscalier.doute_section.title3}
              </h2>
              <Link
                className="fr-mt-4v fr-btn fr-btn--lg fr-icon-arrow-right-line fr-btn--icon-right"
                href={
                  contentSignesASurveiller.fissuresEscalier.doute_section
                    .cta_link
                }
              >
                {
                  contentSignesASurveiller.fissuresEscalier.doute_section
                    .cta_label
                }
              </Link>
            </div>

            {/* Zone image */}
            <div className="fr-col-12 fr-col-md-6 flex justify-center md:justify-end">
              <div className="h-[250px] md:h-[376px] relative w-full max-w-[484px]">
                <Image
                  alt={
                    contentSignesASurveiller.fissuresEscalier.doute_section
                      .image.alt
                  }
                  className="object-contain"
                  fill
                  priority
                  quality={85}
                  sizes="(max-width: 768px) 272px, (max-width: 1024px) 484px, 100vw"
                  src={
                    contentSignesASurveiller.fissuresEscalier.doute_section
                      .image.src
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Voir les autres signes à surveiller */}
      <section className="fr-container-fluid fr-py-10w">
        <div className="fr-container">
          <h1>
            {contentSignesASurveiller.fissuresEscalier.autres_signes.title}
          </h1>
          <div className="fr-grid-row fr-grid-row--gutters">
            {contentSignesASurveiller.fissuresEscalier.autres_signes.signes.map(
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

      {/* Partager la page */}
      <section className="fr-container-fluid fr-py-10w">
        <div className="fr-container [&_h2]:text-[var(--text-title-grey)]! [&_h2]:mt-10!">
          <hr className="fr-my-6w" />
          <div className="fr-share">
            <p className="fr-share__title">Partager la page</p>
            <ul className="fr-btns-group">
              <li>
                <a
                  target="_blank"
                  rel="noopener external"
                  role="link"
                  className="fr-btn--facebook fr-btn"
                >
                  Partager sur Facebook
                </a>
              </li>
              <li>
                <a
                  target="_blank"
                  rel="noopener external"
                  role="link"
                  className="fr-btn--twitter-x fr-btn"
                >
                  Partager sur X (anciennement Twitter)
                </a>
              </li>
              <li>
                <a
                  target="_blank"
                  rel="noopener external"
                  role="link"
                  className="fr-btn--linkedin fr-btn"
                >
                  Partager sur LinkedIn
                </a>
              </li>
              <li>
                <a
                  href="mailto:?subject=[À MODIFIER - objet du mail]&body=[À MODIFIER - titre ou texte descriptif de la page] [À MODIFIER - url de la page]"
                  target="_blank"
                  rel="noopener external"
                  className="fr-btn--mail fr-btn"
                >
                  Partager par email
                </a>
              </li>
              <li>
                <button
                  // onClick={() => {
                  //   navigator.clipboard
                  //     .writeText(window.location.href)
                  //     .then(() => {
                  //       alert("Adresse copiée dans le presse-papier.");
                  //     });
                  // }}
                  type="button"
                  className="fr-btn--copy fr-btn"
                >
                  Copier dans le presse-papier
                </button>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
