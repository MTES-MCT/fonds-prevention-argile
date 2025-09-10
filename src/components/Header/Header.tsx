"use client";

import { contentLayout } from "@/content";
import { richTextParser } from "@/lib/utils";
import Link from "next/link";
import HeaderDropdown from "../HeaderDropDown/HeaderDropDown";

const Header = () => {
  // TODO Récupérer les infos utilisateur depuis système d'auth
  // Par exemple avec useSession() de next-auth
  const isAuthenticated = true; // TODO remplacer par vrai état d'authentification

  const user = {
    name: "Jean Dupont",
    email: "jean.dupont@example.fr",
  };

  return (
    <header role="banner" className="fr-header" id="header-3">
      <div className="fr-header__body">
        <div className="fr-container">
          <div className="fr-header__body-row">
            <div className="fr-header__brand fr-enlarge-link">
              <div className="fr-header__brand-top">
                <div className="fr-header__logo">
                  <p className="fr-logo">
                    {richTextParser(contentLayout.header.affiliatedMinistry)}
                  </p>
                </div>
                <div className="fr-header__navbar">
                  <button
                    data-fr-opened="false"
                    aria-controls="menu-modal-5"
                    title="Menu"
                    type="button"
                    id="menu-4"
                    className="fr-btn--menu fr-btn"
                  >
                    Menu
                  </button>
                </div>
              </div>
              <div className="fr-header__service">
                <Link
                  href="/"
                  title={`Retour à l'accueil du site - ${contentLayout.header.organizationName} - République Française`}
                >
                  <span className="flex flex-row items-center">
                    <p className="fr-header__service-title mr-4!">
                      {contentLayout.header.organizationName}
                    </p>
                    <p className="fr-badge fr-badge--success fr-badge--no-icon">
                      BETA
                    </p>
                  </span>
                </Link>
                <p className="fr-header__service-tagline">
                  {contentLayout.header.organizationDescription}
                </p>
              </div>
            </div>
            <div className="fr-header__tools">
              <div className="fr-header__tools-links">
                <ul className="fr-btns-group">
                  {/* Liens pour desktop */}
                  {contentLayout.header.links.map((link) => (
                    <li key={`desktop-${link.href}`}>
                      <Link href={link.href} className={link.className}>
                        {link.label}
                      </Link>
                    </li>
                  ))}

                  {/* Dropdown utilisateur si connecté */}
                  {isAuthenticated && (
                    <li>
                      <HeaderDropdown
                        userName={user.name}
                        userEmail={user.email}
                      />
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        className="fr-header__menu fr-modal"
        id="menu-modal-5"
        aria-labelledby="menu-4"
      >
        <div className="fr-container">
          <button
            aria-controls="menu-modal-5"
            title="Fermer"
            type="button"
            id="button-32"
            className="fr-btn--close fr-btn"
          >
            Fermer
          </button>
          <div className="fr-header__menu-links">
            {/* Liens pour mobile - IMPORTANT: dupliquer les liens ici */}
            <ul className="fr-btns-group">
              {contentLayout.header.links.map((link) => (
                <li key={`mobile-${link.href}`}>
                  <Link href={link.href} className={link.className}>
                    {link.label}
                  </Link>
                </li>
              ))}

              {/* Menu utilisateur pour mobile */}
              {isAuthenticated && (
                <>
                  <li>
                    <hr className="fr-mt-2w fr-mb-2w" />
                  </li>
                  <li>
                    <button
                      className="fr-btn fr-btn--tertiary-no-outline fr-btn--icon-left"
                      disabled
                      style={{ cursor: "default", opacity: 1 }}
                    >
                      <span
                        className="fr-icon-account-circle-line"
                        aria-hidden="true"
                      />
                      {user.name}
                    </button>
                  </li>
                  <li>
                    <Link
                      href="/account"
                      className="fr-btn fr-btn--tertiary-no-outline"
                    >
                      Mon compte
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/preferences"
                      className="fr-btn fr-btn--tertiary-no-outline"
                    >
                      Mes préférences
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/documents"
                      className="fr-btn fr-btn--tertiary-no-outline"
                    >
                      Mes documents
                    </Link>
                  </li>
                  <li>
                    <hr className="fr-mt-1w fr-mb-1w" />
                  </li>
                  <li>
                    <Link
                      href="/help"
                      className="fr-btn fr-btn--tertiary-no-outline"
                    >
                      Aide
                    </Link>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        // Logique de déconnexion
                        console.log("Déconnexion...");
                      }}
                      className="fr-btn fr-btn--tertiary-no-outline"
                    >
                      Se déconnecter
                    </button>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
