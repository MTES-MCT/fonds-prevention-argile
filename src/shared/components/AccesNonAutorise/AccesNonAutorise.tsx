"use client";

import Image from "next/image";
import Link from "next/link";

/**
 * Props du composant AccesNonAutorise
 */
export interface AccesNonAutoriseProps {
  title?: string;
  message?: string;
  reason?: string;
  homeLink?: string;
  homeLinkText?: string;
  showContactInfo?: boolean;
  illustration?: string;
}

/**
 * Composant d'erreur d'accès non autorisé (403)
 *
 * Affiche un message personnalisable quand un utilisateur
 * tente d'accéder à une ressource sans les droits nécessaires.
 *
 */
export function AccesNonAutorise({
  title = "Accès non autorisé",
  message = "Vous n'avez pas les droits nécessaires pour accéder à cet espace.",
  reason,
  homeLink = "/",
  homeLinkText = "Retour à l'accueil",
  showContactInfo = true,
  illustration = "/illustrations/warning.svg",
}: AccesNonAutoriseProps) {
  return (
    <main role="main" id="content">
      <div className="fr-container">
        <div className="fr-my-7w fr-mt-md-12w fr-mb-md-10w fr-grid-row fr-grid-row--gutters fr-grid-row--middle fr-grid-row--center">
          <div className="fr-py-0 fr-col-12 fr-col-md-6">
            <h1>{title}</h1>
            <p className="fr-text--sm fr-mb-3w">Erreur 403</p>
            <p className="fr-text--lead fr-mb-3w">{message}</p>

            {reason && (
              <p className="fr-text--sm fr-mb-3w">
                <strong>Raison :</strong> {reason}
              </p>
            )}

            {showContactInfo && (
              <p className="fr-text--sm fr-mb-5w">
                Si vous pensez qu&apos;il s&apos;agit d&apos;une erreur, veuillez contacter l&apos;administrateur de la
                plateforme.
              </p>
            )}

            <ul className="fr-btns-group fr-btns-group--inline-md">
              <li>
                <Link className="fr-btn fr-btn--secondary" href={homeLink}>
                  {homeLinkText}
                </Link>
              </li>
            </ul>
          </div>

          <div className="fr-col-12 fr-col-md-3 fr-col-offset-md-1 fr-px-6w fr-px-md-0 fr-py-0">
            <Image alt="Accès non autorisé" className="shrink-0" height={150} src={illustration} width={150} />
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * Variantes prédéfinies pour les cas courants
 */

/**
 * Accès réservé aux administrateurs
 */
export function AccesNonAutoriseAdmin() {
  return (
    <AccesNonAutorise
      title="Espace réservé aux administrateurs"
      message="Vous devez être administrateur ou super administrateur pour accéder à cette page."
      reason="Rôle requis : Administrateur"
    />
  );
}

/**
 * Accès réservé aux agents AMO
 */
export function AccesNonAutoriseAmo() {
  return (
    <AccesNonAutorise
      title="Espace réservé aux AMO"
      message="Vous devez être un agent AMO pour accéder à cette page."
      reason="Rôle requis : AMO"
    />
  );
}

/**
 * Accès réservé aux particuliers
 */
export function AccesNonAutoriseParticulier() {
  return (
    <AccesNonAutorise
      title="Espace réservé aux particuliers"
      message="Vous devez être connecté via FranceConnect pour accéder à cette page."
      reason="Authentification FranceConnect requise"
      homeLink="/connexion"
      homeLinkText="Se connecter"
    />
  );
}

/**
 * Agent ProConnect non enregistré
 */
export function AccesNonAutoriseAgentNonEnregistre() {
  return (
    <AccesNonAutorise
      title="Accès non autorisé"
      message="Votre compte ProConnect n'est pas enregistré dans notre système ou ne dispose pas des autorisations requises."
      reason="Agent non enregistré dans la base de données"
    />
  );
}
