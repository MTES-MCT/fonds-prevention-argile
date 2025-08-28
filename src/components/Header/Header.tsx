import { contentLayout } from "@/content";
import { richTextParser } from "@/utils";
import Link from "next/link";

const Header = () => {
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
                  title="Retour à l'accueil du site - [À MODIFIER - texte alternatif de l'image : nom de l'opérateur ou du site serviciel] - République Française"
                >
                  <span className="flex flex-row">
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
                  <li>
                    <Link
                      href="/connexion"
                      className="fr-icon-account-circle-fill fr-btn"
                    >
                      Se connecter
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/simulateur"
                      className="fr-btn--account fr-icon-checkbox-circle-fill fr-btn"
                    >
                      Verifier mon éligibilité
                    </Link>
                  </li>
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
          <div className="fr-header__menu-links"></div>
        </div>
      </div>
    </header>
  );
};

export default Header;
