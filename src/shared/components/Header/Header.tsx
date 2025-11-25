"use client";

import { useAuth } from "@/features/auth/client";
import { useIsAgent } from "@/features/auth/hooks";
import Link from "next/link";

const Header = () => {
  const { isAuthenticated, logout } = useAuth();
  const isAgent = useIsAgent();

  return (
    <header role="banner" className="fr-header" id="header-3">
      <div className="fr-header__body">
        <div className="fr-container">
          <div className="fr-header__body-row">
            <div className="fr-header__brand fr-enlarge-link">
              <div className="fr-header__brand-top">
                <div className="fr-header__logo">
                  <p className="fr-logo">
                    Ministère
                    <br />
                    de la transition
                    <br />
                    écologique
                  </p>
                </div>
                <div className="fr-header__navbar">
                  <button
                    data-fr-opened="false"
                    aria-controls="menu-modal-5"
                    title="Menu"
                    type="button"
                    id="menu-4"
                    className="fr-btn--menu fr-btn">
                    Menu
                  </button>
                </div>
              </div>
              <div className="fr-header__service">
                <Link href="/" title={`Retour à l'accueil du site - Fonds prévention argile - République Française`}>
                  <span className="flex flex-row items-center">
                    <p className="fr-header__service-title mr-4!">Fonds prévention argile</p>
                    <p className="fr-badge fr-badge--success fr-badge--no-icon">BETA</p>
                  </span>
                </Link>
                <p className="fr-header__service-tagline">Retrait Gonflement des Argiles - Aides aux ménages</p>
              </div>
            </div>
            <div className="fr-header__tools">
              <div className="fr-header__tools-links">
                <ul className="fr-btns-group">
                  {!isAuthenticated ? (
                    <>
                      <li>
                        <Link href="/connexion/agent" className="fr-icon-government-fill fr-btn">
                          Agent
                        </Link>
                      </li>
                      <li>
                        <Link href="/connexion" className="fr-icon-account-circle-fill fr-btn">
                          Se connecter
                        </Link>
                      </li>
                      <li>
                        <Link href="/simulateur" className="fr-btn--account fr-icon-checkbox-circle-fill fr-btn">
                          Vérifier mon éligibilité
                        </Link>
                      </li>
                    </>
                  ) : (
                    <>
                      {isAgent ? (
                        <li>
                          <Link href="/administration" className="fr-icon-settings-5-line fr-btn">
                            Administration
                          </Link>
                        </li>
                      ) : (
                        <li>
                          <Link href="/mon-compte" className="fr-icon-folder-2-fill fr-btn">
                            Mon dossier
                          </Link>
                        </li>
                      )}
                      <li>
                        <button
                          onClick={() => logout()}
                          className="fr-btn--account fr-icon-logout-box-r-line fr-btn"
                          type="button">
                          Se déconnecter
                        </button>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="fr-header__menu fr-modal" id="menu-modal-5" aria-labelledby="menu-4">
        <div className="fr-container">
          <button
            aria-controls="menu-modal-5"
            title="Fermer"
            type="button"
            id="button-32"
            className="fr-btn--close fr-btn">
            Fermer
          </button>
          <div className="fr-header__menu-links">
            <ul className="fr-btns-group">
              {!isAuthenticated ? (
                <>
                  <li>
                    <Link href="/connexion/agent" className="fr-icon-government-fill fr-btn">
                      Agent
                    </Link>
                  </li>
                  <li>
                    <Link href="/connexion" className="fr-icon-account-circle-fill fr-btn">
                      Se connecter
                    </Link>
                  </li>
                  <li>
                    <Link href="/simulateur" className="fr-btn--account fr-icon-checkbox-circle-fill fr-btn">
                      Vérifier mon éligibilité
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  {isAgent ? (
                    <li>
                      <Link href="/administration" className="fr-icon-settings-5-line fr-btn">
                        Administration
                      </Link>
                    </li>
                  ) : (
                    <li>
                      <Link href="/mon-compte" className="fr-icon-folder-2-fill fr-btn">
                        Mon dossier
                      </Link>
                    </li>
                  )}
                  <li>
                    <button
                      onClick={() => logout()}
                      className="fr-btn--account fr-icon-logout-box-r-line fr-btn"
                      type="button">
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
