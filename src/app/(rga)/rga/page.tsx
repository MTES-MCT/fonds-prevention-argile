import type { Metadata } from "next";

import { getAllDepartements, getAllEpcis } from "@/features/seo";

import commonContent from "./content/common.json";
import Link from "next/link";
import { CtaSmall } from "./components";
import SavoirSiConcerneSection from "@/app/(main)/(home)/components/SavoirSiConcerneSection";

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
  const epciList = getAllEpcis();

  return (
    <main>
      {/* Hero */}
      <section className="fr-py-2v">
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

      {/* Qu'est-ce que le RGA */}
      <section className="fr-py-2w">
        <div className="fr-container">
          <h2>Qu'est-ce que le Retrait-Gonflement des Argiles ?</h2>
          <p>
            Le phénomène de retrait-gonflement des argiles se manifeste par des changements du volume d'un sol argileux
            à proximité des fondations d'une maison. Sec, il se rétracte ; humide, il gonfle, endommageant notamment les
            maisons individuelles.
          </p>
          <p>
            Le changement climatique aggrave ce phénomène : les dernières projections réalisées par la Caisse centrale
            de réassurance (CCR) tablent sur une <strong>augmentation de 44% à 162%</strong> de la sinistralité due au
            retrait-gonglement des argiles d'ici 2050.
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

      {/* Liste des EPCI */}
      <section className="fr-py-4w">
        <div className="fr-container">
          <h2>Intercommunalités éligibles</h2>
          <p>{epciList.length} intercommunalités sont concernées par le dispositif.</p>

          <ul className="fr-tags-group">
            {epciList.map((epci) => (
              <li key={epci.codeSiren}>
                <a href={`/rga/epci/${epci.slug}`} className="fr-tag">
                  {epci.nom}
                </a>
              </li>
            ))}
          </ul>
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
      <CtaSmall />

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
      <SavoirSiConcerneSection />
    </main>
  );
}
