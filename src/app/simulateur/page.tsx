"use client";

import { contentSimulationPage } from "@/content";
import Link from "next/link";

export default function Simulateur() {
  // Debug des variables d'environnement
  const iframeUrl = process.env.NEXT_PUBLIC_MESAIDES_RENOV_IFRAME_URL;
  const iframeHeight = process.env.NEXT_PUBLIC_MESAIDES_RENOV_IFRAME_HEIGHT;

  return (
    <section className="fr-container-fluid fr-py-4w">
      <div className="fr-container">
        <nav
          role="navigation"
          className="fr-breadcrumb"
          aria-label="vous êtes ici :"
        >
          <button
            className="fr-breadcrumb__button"
            aria-expanded="false"
            aria-controls="breadcrumb"
          >
            Voir le fil d'Ariane
          </button>
          <div className="fr-collapse" id="breadcrumb">
            <ol className="fr-breadcrumb__list">
              <li>
                <Link className="fr-breadcrumb__link" href="/">
                  {contentSimulationPage.breadcrumb.home}
                </Link>
              </li>
              <li>
                <a className="fr-breadcrumb__link" aria-current="page">
                  {contentSimulationPage.breadcrumb.simulation}
                </a>
              </li>
            </ol>
          </div>
        </nav>

        <h1 className="fr-mb-6w text-[var(--text-title-grey)]!">
          {contentSimulationPage.title}
        </h1>

        {/* Conditional rendering de l'iframe */}
        {iframeUrl ? (
          <iframe
            src={iframeUrl}
            title="Simulateur Mesaides Rénov'"
            className="w-full border-0 shadow-lg rounded-lg fr-mt-4w fr-mb-6w"
            style={{
              height: iframeHeight || "800px",
              minHeight: "600px",
            }}
            referrerPolicy="no-referrer-when-downgrade"
            aria-label="Simulateur d'éligibilité aux aides"
            onLoad={() => console.log("✅ Iframe loaded successfully")}
            onError={(e) => console.error("❌ Iframe error:", e)}
          />
        ) : (
          <div className="fr-alert fr-alert--error fr-mt-4w fr-mb-6w">
            <p>
              <strong>Erreur de configuration :</strong> L'URL du simulateur
              n'est pas définie. Variable d'environnement
              NEXT_PUBLIC_MESAIDES_RENOV_IFRAME_URL manquante.
            </p>
          </div>
        )}
      </div>

      <div className="fr-container">
        <noscript>
          <div className="fr-alert fr-alert--warning">
            <p>
              Le simulateur nécessite JavaScript pour fonctionner correctement.
            </p>
          </div>
        </noscript>

        <div className="fr-callout fr-mt-4w">
          <h3 className="fr-callout__title">Besoin d'aide ?</h3>
          <p className="fr-callout__text">
            Si vous rencontrez des difficultés avec le simulateur, vous pouvez
            nous contacter via le formulaire de contact ou consulter notre FAQ.
          </p>
        </div>
      </div>
    </section>
  );
}
