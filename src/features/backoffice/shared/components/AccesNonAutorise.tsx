import Image from "next/image";
import Link from "next/link";

/**
 * Page affichée quand un agent ProConnect n'est pas enregistré
 * dans la table agents ou n'a pas les droits d'accès
 *
 * TODO: Ajouter un formulaire de demande d'accès
 * TODO: Ajouter les coordonnées de contact administrateur
 */
export function AccesNonAutorise() {
  return (
    <main role="main" id="content">
      <div className="fr-container">
        <div className="fr-my-7w fr-mt-md-12w fr-mb-md-10w fr-grid-row fr-grid-row--gutters fr-grid-row--middle fr-grid-row--center">
          <div className="fr-py-0 fr-col-12 fr-col-md-6">
            <h1>Accès non autorisé</h1>
            <p className="fr-text--sm fr-mb-3w">Erreur 403</p>
            <p className="fr-text--lead fr-mb-3w">
              Vous n&apos;avez pas les droits nécessaires pour accéder à cet espace.
            </p>
            <p className="fr-text--sm fr-mb-5w">
              Votre compte ProConnect n&apos;est pas enregistré dans notre système ou ne dispose pas des autorisations
              requises.
              <br />
              <br />
              Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, veuillez contacter l&apos;administrateur de la
              plateforme.
            </p>
            <ul className="fr-btns-group fr-btns-group--inline-md">
              <li>
                <Link className="fr-btn fr-btn--secondary" href="/">
                  Retour à l&apos;accueil
                </Link>
              </li>
              {/* TODO: Ajouter un lien vers formulaire de contact ou demande d'accès */}
            </ul>
          </div>
          <div className="fr-col-12 fr-col-md-3 fr-col-offset-md-1 fr-px-6w fr-px-md-0 fr-py-0">
            <Image
              alt="Accès non autorisé"
              className="shrink-0"
              height={150}
              src="/illustrations/warning.svg"
              width={150}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
