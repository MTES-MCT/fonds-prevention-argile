import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation - Intégration iframe | Fonds prévention argile",
  description:
    "Guide d'intégration de notre simulateur d'éligibilité sur votre site partenaire",
  robots: "noindex, nofollow",
};

export default function DocumentationIntegrationPage() {
  const iframeCode = `<iframe 
  src="https://fonds-prevention-argile.beta.gouv.fr/embed-simulateur"
  title="Simulateur d'éligibilité au Fonds prévention argile"
  style="width: 100%; height: 800px; border: none;"
  referrerpolicy="no-referrer-when-downgrade"
></iframe>`;

  const iframeCodeStyled = `<iframe 
  src="https://fonds-prevention-argile.beta.gouv.fr/embed-simulateur"
  title="Simulateur d'éligibilité au Fonds prévention argile"
  style="width: 100%; 
         height: 800px; 
         border: none; 
         border-radius: 8px;
         box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
         display: block;
         margin: 2rem auto;
         max-width: 1200px;"
  referrerpolicy="no-referrer-when-downgrade"
></iframe>`;

  return (
    <div className="fr-container fr-py-6w">
      {/* Breadcrumb */}
      <nav
        role="navigation"
        className="fr-breadcrumb"
        aria-label="vous êtes ici :"
      >
        <button
          className="fr-breadcrumb__button"
          aria-expanded="false"
          aria-controls="breadcrumb-integration"
        >
          Voir le fil d'Ariane
        </button>
        <div className="fr-collapse" id="breadcrumb-integration">
          <ol className="fr-breadcrumb__list">
            <li>
              <a className="fr-breadcrumb__link" href="/">
                Accueil
              </a>
            </li>
            <li>
              <a className="fr-breadcrumb__link" href="#">
                Partenaires
              </a>
            </li>
            <li>
              <a className="fr-breadcrumb__link" aria-current="page">
                Intégration iframe
              </a>
            </li>
          </ol>
        </div>
      </nav>

      {/* Titre principal */}
      <h1 className="fr-mt-4w">Intégrer le simulateur sur votre site</h1>
      <p className="fr-text--lead">
        Simulateur d'éligibilité au Fonds prévention argile
      </p>

      {/* Introduction */}
      <div className="fr-callout fr-mt-6w">
        <h2 className="fr-callout__title">
          Un service public à disposition de vos utilisateurs
        </h2>
        <p className="fr-callout__text">
          Le Fonds prévention argile est un service public qui aide les
          propriétaires à prévenir les risques liés au retrait-gonflement des
          argiles. En intégrant notre simulateur d'éligibilité directement sur
          votre site, vous permettez à vos visiteurs de vérifier leurs droits
          aux aides sans quitter votre plateforme.
        </p>
      </div>

      {/* Démonstration */}
      <h2 className="fr-mt-8w">Démonstration</h2>
      <p>
        Voici à quoi ressemble le simulateur intégré sur votre site. Les
        utilisateurs peuvent remplir le formulaire et, s'ils sont éligibles,
        seront redirigés vers la plateforme officielle pour finaliser leur
        demande.
      </p>

      <div className="fr-mt-4w">
        <iframe
          src="https://staging.fonds-prevention-argile.beta.gouv.fr/embed-simulateur"
          title="Simulateur d'éligibilité au Fonds prévention argile - Démonstration"
          style={{
            width: "100%",
            height: "800px",
            border: "none",
            borderRadius: "8px",
            boxShadow:
              "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          }}
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      {/* Code d'intégration */}
      <h2 className="fr-mt-8w">Code d'intégration</h2>
      <p>
        Voici le code à intégrer dans votre HTML ou votre système de gestion de
        contenu (Wordpress, Drupal, etc.) :
      </p>

      <h3 className="fr-mt-4w fr-h6">Version simple</h3>
      <div className="fr-highlight">
        <pre>
          <code>{iframeCode}</code>
        </pre>
      </div>

      <h3 className="fr-mt-4w fr-h6">Version avec styles personnalisés</h3>
      <p>
        Vous pouvez personnaliser l'apparence avec des ombres portées, des
        bordures arrondies et un centrage automatique :
      </p>
      <div className="fr-highlight">
        <pre>
          <code>{iframeCodeStyled}</code>
        </pre>
      </div>

      {/* Notes importantes */}
      <div className="fr-alert fr-alert--info fr-mt-4w">
        <h3 className="fr-alert__title">Points d'attention</h3>
        <ul>
          <li>
            La hauteur minimale recommandée est de <strong>800px</strong> pour
            afficher correctement le simulateur
          </li>
          <li>
            L'iframe est responsive et s'adapte automatiquement à la largeur
            disponible
          </li>
          <li>
            À la fin de la simulation, une nouvelle fenêtre s'ouvre
            automatiquement vers la page de connexion (comportement normal pour
            les iframes)
          </li>
        </ul>
      </div>

      {/* Checklist d'intégration */}
      <h2 className="fr-mt-8w">Checklist d'intégration</h2>

      <div className="fr-accordions-group">
        <section className="fr-accordion">
          <h3 className="fr-accordion__title">
            <button
              className="fr-accordion__btn"
              aria-expanded="false"
              aria-controls="accordion-1"
            >
              1. Préparer l'espace sur votre site
            </button>
          </h3>
          <div className="fr-collapse" id="accordion-1">
            <ul>
              <li>
                Identifier la page ou la section où intégrer le simulateur
              </li>
              <li>
                Prévoir une hauteur minimale de 800px pour l'affichage optimal
              </li>
              <li>
                S'assurer que la largeur disponible est d'au moins 400px (pour
                mobile)
              </li>
            </ul>
          </div>
        </section>

        <section className="fr-accordion">
          <h3 className="fr-accordion__title">
            <button
              className="fr-accordion__btn"
              aria-expanded="false"
              aria-controls="accordion-2"
            >
              2. Intégrer le code
            </button>
          </h3>
          <div className="fr-collapse" id="accordion-2">
            <ul>
              <li>Copier le code HTML fourni ci-dessus</li>
              <li>
                Coller le code dans votre page HTML ou votre éditeur de contenu
              </li>
              <li>
                Adapter les styles CSS selon votre charte graphique si besoin
              </li>
              <li>Vérifier que l'iframe s'affiche correctement</li>
            </ul>
          </div>
        </section>

        <section className="fr-accordion">
          <h3 className="fr-accordion__title">
            <button
              className="fr-accordion__btn"
              aria-expanded="false"
              aria-controls="accordion-3"
            >
              3. Tester le parcours utilisateur
            </button>
          </h3>
          <div className="fr-collapse" id="accordion-3">
            <ul>
              <li>
                Tester la simulation complète depuis votre site en version
                desktop
              </li>
              <li>Vérifier l'affichage responsive sur mobile et tablette</li>
              <li>
                Confirmer que la redirection vers la page de connexion
                fonctionne
              </li>
              <li>S'assurer que les popups ne sont pas bloqués par défaut</li>
            </ul>
          </div>
        </section>

        <section className="fr-accordion">
          <h3 className="fr-accordion__title">
            <button
              className="fr-accordion__btn"
              aria-expanded="false"
              aria-controls="accordion-4"
            >
              4. Communiquer auprès de vos utilisateurs
            </button>
          </h3>
          <div className="fr-collapse" id="accordion-4">
            <ul>
              <li>Informer vos visiteurs de la disponibilité du simulateur</li>
              <li>
                Expliquer que le service est fourni par le gouvernement français
              </li>
              <li>
                Mentionner la gratuité et l'absence d'engagement du test
                d'éligibilité
              </li>
            </ul>
          </div>
        </section>
      </div>

      {/* Support */}
      <h2 className="fr-mt-8w">Besoin d'aide ?</h2>
      <div className="fr-callout fr-callout--brown-caramel">
        <h3 className="fr-callout__title">Support technique</h3>
        <p className="fr-callout__text">
          Notre équipe est disponible pour vous accompagner dans l'intégration
          du simulateur sur votre site.
        </p>
        <p>
          <strong>Contact :</strong>{" "}
          <a href="mailto:contact@fonds-prevention-argile.beta.gouv.fr">
            contact@fonds-prevention-argile.beta.gouv.fr
          </a>
        </p>
        <p className="fr-text--sm">
          Délai de réponse moyen : 48 heures ouvrées
        </p>
      </div>

      {/* Retour à l'accueil */}
      <div className="fr-mt-8w fr-mb-6w">
        <a className="fr-btn fr-btn--secondary" href="/">
          ← Retour à l'accueil
        </a>
      </div>
    </div>
  );
}
