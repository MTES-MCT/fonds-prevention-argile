"use client";

import { useAuth } from "@/features/auth/client";
import { useIsAgent, useCanAccessAdministration, useCanAccessEspaceAgent } from "@/features/auth/hooks";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import Link from "next/link";
import { BackofficeNavigation } from "@/shared/components/BackofficeNavigation";

/**
 * Liens de navigation agent (desktop, haut de header).
 * Le bouton « Vue espace agent » a été retiré : sur desktop, la rangée « Suivi des
 * dossiers » de la navigation backoffice (ADR-0015) rend cette bascule inutile.
 * On garde un accès direct à l'administration pour qui y a droit.
 */
function AgentNavLinks() {
  const showAdmin = useCanAccessAdministration();

  if (!showAdmin) return null;

  return (
    <li>
      <Link href={ROUTES.backoffice.administration.root} className="fr-icon-settings-5-line fr-btn">
        Administration
      </Link>
    </li>
  );
}

/**
 * Liens de navigation agent (mobile, modal).
 * Le modal est la navigation sur mobile (les rangées backoffice sont desktop) :
 * on y expose donc les deux espaces selon les capacités (ADR-0015).
 */
function AgentNavLinksMobile() {
  const showAdmin = useCanAccessAdministration();
  const showAgent = useCanAccessEspaceAgent();

  if (!showAdmin && !showAgent) return null;

  return (
    <>
      {showAdmin && (
        <li>
          <Link href={ROUTES.backoffice.administration.root} className="fr-icon-settings-5-line fr-btn">
            Administration
          </Link>
        </li>
      )}
      {showAgent && (
        <li>
          <Link href="/espace-agent/dossiers" className="fr-icon-folder-2-line fr-btn">
            Dossiers
          </Link>
        </li>
      )}
    </>
  );
}

const Header = () => {
  const { isAuthenticated, logout } = useAuth();
  const isAgent = useIsAgent();

  return (
    <header role="banner" className="fr-header sticky" id="header-3">
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
                        <Link
                          href={ROUTES.connexion.agent}
                          className="fr-icon-briefcase-fill fr-btn fr-btn--tertiary-no-outline"
                          style={{ color: "var(--text-default-error)" }}>
                          ProConnect
                        </Link>
                      </li>
                      <li>
                        <Link href={ROUTES.connexion.particulier} className="fr-icon-account-circle-fill fr-btn">
                          Connexion particulier
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
                        <>
                          <li>
                            <Link href={ROUTES.conseillers} className="fr-icon-map-pin-user-fill fr-btn">
                              Trouver mon conseiller
                            </Link>
                          </li>
                          <li>
                            <Link href={ROUTES.simulateur} className="fr-icon-checkbox-circle-fill fr-btn">
                              Vérifier mon éligibilité
                            </Link>
                          </li>
                          <li>
                            <Link href={ROUTES.particulier.monCompte} className="fr-icon-folder-2-fill fr-btn">
                              Mon dossier
                            </Link>
                          </li>
                        </>
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

      {/* Navigation backoffice unifiée (deux rangées pilotées par rôle, ADR-0015) */}
      <BackofficeNavigation />

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
                    <Link
                      href={ROUTES.connexion.agent}
                      className="fr-icon-briefcase-fill fr-btn fr-btn--tertiary-no-outline"
                      style={{ color: "var(--text-default-error)" }}>
                      ProConnect
                    </Link>
                  </li>
                  <li>
                    <Link href={ROUTES.connexion.particulier} className="fr-icon-account-circle-fill fr-btn">
                      Connexion particulier
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
                    <>
                      <li>
                        <Link href={ROUTES.conseillers} className="fr-icon-user-heart-line fr-btn">
                          Trouver mon conseiller
                        </Link>
                      </li>
                      <li>
                        <Link href={ROUTES.simulateur} className="fr-icon-checkbox-circle-fill fr-btn">
                          Vérifier mon éligibilité
                        </Link>
                      </li>
                      <li>
                        <Link href={ROUTES.particulier.monCompte} className="fr-icon-folder-2-fill fr-btn">
                          Mon dossier
                        </Link>
                      </li>
                    </>
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
