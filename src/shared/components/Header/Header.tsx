"use client";

import { useAuth } from "@/features/auth/client";
import { useAgentRole, useIsAgent } from "@/features/auth/hooks";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import Link from "next/link";

/**
 * Liens de navigation pour les agents selon leur rôle
 */
function AgentNavLinks() {
  const agentRole = useAgentRole();

  switch (agentRole) {
    case UserRole.ANALYSTE:
    case UserRole.ADMINISTRATEUR:
    case UserRole.SUPER_ADMINISTRATEUR:
      return (
        <li>
          <Link href={ROUTES.backoffice.administration.root} className="fr-icon-settings-5-line fr-btn">
            Administration
          </Link>
        </li>
      );

    case UserRole.AMO:
      return (
        <>
          <li>
            <Link href={ROUTES.backoffice.espaceAmo.notifications} className="fr-icon-notification-3-line fr-btn">
              Notifications
            </Link>
          </li>
          <li>
            <Link href={ROUTES.backoffice.espaceAmo.dossiers} className="fr-icon-folder-2-line fr-btn">
              Mes dossiers
            </Link>
          </li>
        </>
      );

    default:
      return null;
  }
}

/**
 * Liens de navigation pour les agents (version mobile)
 */
function AgentNavLinksMobile() {
  const agentRole = useAgentRole();

  switch (agentRole) {
    case UserRole.ANALYSTE:
    case UserRole.ADMINISTRATEUR:
    case UserRole.SUPER_ADMINISTRATEUR:
      return (
        <li>
          <Link href={ROUTES.backoffice.administration.root} className="fr-icon-settings-5-line fr-btn">
            Administration
          </Link>
        </li>
      );

    case UserRole.AMO:
      return (
        <>
          <li>
            <Link href={ROUTES.backoffice.espaceAmo.notifications} className="fr-icon-notification-3-line fr-btn">
              Notifications
            </Link>
          </li>
          <li>
            <Link href={ROUTES.backoffice.espaceAmo.dossiers} className="fr-icon-folder-2-line fr-btn">
              Mes dossiers
            </Link>
          </li>
        </>
      );

    default:
      return null;
  }
}

const Header = () => {
  const { isAuthenticated, logout } = useAuth();
  const isAgent = useIsAgent();

  return (
    <header role="banner" className="fr-header" id="header-3">
      {/* Menu desktop */}
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
                    aria-controls="menu-modal-mobile"
                    title="Menu"
                    type="button"
                    id="menu-mobile"
                    className="fr-btn--menu fr-btn">
                    Menu
                  </button>
                </div>
              </div>
              <div className="fr-header__service">
                <Link
                  href={ROUTES.home}
                  title={`Retour à l'accueil du site - Fonds prévention argile - République Française`}>
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
                        <Link href={ROUTES.connexion.particulier} className="fr-icon-account-circle-fill fr-btn">
                          Se connecter
                        </Link>
                      </li>
                      <li>
                        <Link href={ROUTES.simulateur} className="fr-btn--account fr-icon-checkbox-circle-fill fr-btn">
                          Vérifier mon éligibilité
                        </Link>
                      </li>
                    </>
                  ) : (
                    <>
                      {isAgent ? (
                        <AgentNavLinks />
                      ) : (
                        <li>
                          <Link href={ROUTES.particulier.monCompte} className="fr-icon-folder-2-fill fr-btn">
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

      {/* Menu mobile */}
      <div className="fr-header__menu fr-modal" id="menu-modal-mobile" aria-labelledby="menu-mobile">
        <div className="fr-container">
          <button
            aria-controls="menu-modal-mobile"
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
                    <Link href={ROUTES.connexion.particulier} className="fr-icon-account-circle-fill fr-btn">
                      Se connecter
                    </Link>
                  </li>
                  <li>
                    <Link href={ROUTES.simulateur} className="fr-btn--account fr-icon-checkbox-circle-fill fr-btn">
                      Vérifier mon éligibilité
                    </Link>
                  </li>
                </>
              ) : (
                <>
                  {isAgent ? (
                    <AgentNavLinksMobile />
                  ) : (
                    <li>
                      <Link href={ROUTES.particulier.monCompte} className="fr-icon-folder-2-fill fr-btn">
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
