import { contentSimulationPage } from "@/content";

export default function Simulateur() {
  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container [&_h2]:text-[var(--text-title-grey)]! [&_h2]:mt-10!">
        <h1 className="fr-mb-6w text-[var(--text-title-grey)]!">
          {contentSimulationPage.title}
        </h1>
        <p className="fr-text--lg fr-mb-4w">
          Utilisez notre simulateur pour évaluer votre éligibilité aux aides du
          Fonds de prévention.
        </p>

        {/* Iframe */}
        <iframe
          src={process.env.MESAIDES_RENOV_IFRAME_URL}
          title="Simulateur Mesaides Rénov'"
          className="w-full border-0 shadow-lg rounded-lg fr-mt-4w fr-mb-6w"
          style={{
            height: process.env.MESAIDES_RENOV_IFRAME_HEIGHT || "800px",
            minHeight: "600px",
          }}
          // TODO : Supprimer les logs en production
          onError={() => console.log("Erreur de chargement iframe")}
          onLoad={() => console.log("Iframe chargée avec succès")}
          referrerPolicy="no-referrer-when-downgrade"
          aria-label="Simulateur d'éligibilité aux aides"
        />
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
