import { contentSimulationPage } from "@/content";

export default function Simulateur() {
  // Debug des variables d'environnement
  const iframeUrl = process.env.MESAIDES_RENOV_IFRAME_URL;
  const iframeHeight = process.env.MESAIDES_RENOV_IFRAME_HEIGHT;

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

        {/* Debug info - à retirer en production */}
        {process.env.NODE_ENV !== "production" && (
          <div className="bg-yellow-100 p-4 rounded mb-4 text-sm">
            <p>
              <strong>Debug:</strong>
            </p>
            <p>URL: {iframeUrl || "❌ UNDEFINED"}</p>
            <p>Height: {iframeHeight || "❌ UNDEFINED"}</p>
            <p>Node ENV: {process.env.NODE_ENV}</p>
          </div>
        )}

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
              MESAIDES_RENOV_IFRAME_URL manquante.
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
