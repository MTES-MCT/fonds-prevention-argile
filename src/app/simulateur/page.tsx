import { contentSimulationPage } from "@/content";

export default function Simulateur() {
  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container [&_h2]:text-[var(--text-title-grey)]! [&_h2]:mt-10!">
        <h1 className="fr-mb-6w text-[var(--text-title-grey)]!">
          {contentSimulationPage.title}
        </h1>

        {/* Description ou instructions */}
        <p className="fr-text--lg fr-mb-4w">
          Utilisez notre simulateur pour évaluer votre éligibilité aux aides du
          Fonds de prévention.
        </p>

        {/* Container de l'iframe avec responsive design */}
        <div className="fr-mt-4w fr-mb-6w">
          <iframe
            src="https://example.com" // TODO Remplacer par l'URL finale
            title="Simulateur Fonds Prévention Argile"
            width="100%"
            height="800"
            className="border-0 shadow-lg rounded-lg"
            // Sécurité et permissions
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            referrerPolicy="no-referrer-when-downgrade"
            // Accessibilité
            aria-label="Simulateur d'éligibilité aux aides"
            // Style responsive
            style={{
              minHeight: "600px",
              maxWidth: "100%",
            }}
          />
        </div>

        {/* Message de fallback si iframe ne charge pas */}
        <noscript>
          <div className="fr-alert fr-alert--warning">
            <p>
              Le simulateur nécessite JavaScript pour fonctionner correctement.
            </p>
          </div>
        </noscript>

        {/* Informations complémentaires */}
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
