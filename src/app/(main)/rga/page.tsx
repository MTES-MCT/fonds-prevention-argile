import type { Metadata } from "next";

import { getAllDepartements } from "@/features/seo";

import commonContent from "./content/common.json";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Retrait-Gonflement des Argiles (RGA) | Fonds Prévention Argile",
  description:
    "Découvrez les risques de retrait-gonflement des argiles dans les 11 départements éligibles au Fonds Prévention Argile. Vérifiez si votre maison peut bénéficier des aides de l'État.",
  openGraph: {
    title: "Retrait-Gonflement des Argiles (RGA) | Fonds Prévention Argile",
    description:
      "Découvrez les risques de retrait-gonflement des argiles dans les 11 départements éligibles au Fonds Prévention Argile.",
    type: "website",
  },
};

/**
 * Page d'index RGA - Point d'entrée du cocon sémantique
 */
export default function RgaIndexPage() {
  const departements = getAllDepartements();

  return (
    <main>
      {/* Hero */}
      <section className="fr-py-6w">
        <div className="fr-container">
          {/* Breadcrumb */}
          <nav role="navigation" className="fr-breadcrumb" aria-label="vous êtes ici :">
            <button className="fr-breadcrumb__button" aria-expanded="false" aria-controls="breadcrumb-rga">
              Voir le fil d'Ariane
            </button>
            <div className="fr-collapse" id="breadcrumb-rga">
              <ol className="fr-breadcrumb__list">
                <li>
                  <Link className="fr-breadcrumb__link" href="/">
                    {commonContent.breadcrumb.home}
                  </Link>
                </li>
                <li>
                  <span className="fr-breadcrumb__link" aria-current="page">
                    {commonContent.breadcrumb.rga}
                  </span>
                </li>
              </ol>
            </div>
          </nav>

          <h1>Le Retrait-Gonflement des Argiles en France</h1>
          <p className="fr-text--lead">
            Le Fonds de Prévention Argile accompagne les propriétaires de maisons situées dans les 11 départements
            éligibles au dispositif.
          </p>
        </div>
      </section>

      {/* Liste des départements */}
      <section className="fr-py-4w">
        <div className="fr-container">
          <h2>Départements éligibles au dispositif</h2>
          <p>
            Cliquez sur un département pour découvrir les informations locales sur le risque RGA et les communes
            concernées.
          </p>

          <div className="fr-grid-row fr-grid-row--gutters fr-mt-4w">
            {departements.map((departement) => (
              <div key={departement.code} className="fr-col-12 fr-col-md-4">
                <div className="fr-card fr-card--no-arrow fr-enlarge-link">
                  <div className="fr-card__body">
                    <div className="fr-card__content">
                      <h3 className="fr-card__title">
                        <a href={`/rga/departement/${departement.slug}`}>
                          {departement.nom} ({departement.code})
                        </a>
                      </h3>
                      <p className="fr-card__desc">
                        {departement.population?.toLocaleString("fr-FR")} habitants
                        <br />
                        {departement.nombreCommunesRGA} communes référencées
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Qu'est-ce que le RGA */}
      <section className="fr-py-4w">
        <div className="fr-container">
          <h2>Qu'est-ce que le Retrait-Gonflement des Argiles ?</h2>
          <p>
            Le sol de nombreuses régions françaises contient des argiles sensibles aux variations d'humidité. Lors des
            périodes de sécheresse, ces argiles se rétractent, provoquant des tassements de terrain. À l'inverse, lors
            d'épisodes pluvieux, elles se gorgent d'eau et gonflent.
          </p>
          <p>
            Ces mouvements alternés, appelés Retrait-Gonflement des Argiles (RGA), fragilisent progressivement les
            fondations des habitations et peuvent causer des dégâts importants.
          </p>
        </div>
      </section>

      {/* Dégâts visibles */}
      <section className="fr-py-4w">
        <div className="fr-container">
          <h2>
            {commonContent.degats.emoji} {commonContent.degats.title}
          </h2>
          {commonContent.degats.content.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="fr-py-4w">
        <div className="fr-container">
          <div className="fr-callout">
            <p className="fr-callout__text">{commonContent.cta.small.text}</p>
            <a className="fr-btn" href={commonContent.cta.small.buttonLink}>
              {commonContent.cta.small.buttonLabel}
            </a>
          </div>
        </div>
      </section>

      {/* L'État vous accompagne */}
      <section className="fr-py-4w">
        <div className="fr-container">
          <h2>
            {commonContent.etatAccompagne.emoji} {commonContent.etatAccompagne.title}
          </h2>
          {commonContent.etatAccompagne.content.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          <ul>
            {commonContent.etatAccompagne.liste.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <p>{commonContent.etatAccompagne.conclusion}</p>
        </div>
      </section>

      {/* CTA Full Width */}
      <section className="fr-py-4w" style={{ backgroundColor: "#f5f5fe" }}>
        <div className="fr-container">
          <div className="fr-grid-row fr-grid-row--middle">
            <div className="fr-col-12 fr-col-md-6">
              <p className="fr-text--lead">{commonContent.cta.fullWidth.text}</p>
              <a className="fr-btn" href={commonContent.cta.fullWidth.buttonLink}>
                {commonContent.cta.fullWidth.buttonLabel}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer spécifique - TODO: Composant dédié */}
    </main>
  );
}
