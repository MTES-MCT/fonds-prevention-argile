"use client";

import { contentConnexionPage } from "@/content";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/contexts/AuthContext";
import { useSearchParams } from "next/navigation";
import { FC_ERROR_MAPPING } from "@/lib/auth/client";

export default function ConnexionClient() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fcError, setFcError] = useState<string | null>(null);

  const { login, isLoading, error } = useAuth();
  const searchParams = useSearchParams();

  // Gérer les erreurs FranceConnect depuis l'URL
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      switch (errorParam) {
        case FC_ERROR_MAPPING.access_denied:
          setFcError("Vous avez annulé la connexion FranceConnect.");
          break;
        case FC_ERROR_MAPPING.invalid_state:
          setFcError("Erreur de sécurité. Veuillez réessayer.");
          break;
        case FC_ERROR_MAPPING.fc_missing_params:
          setFcError("Erreur lors de l'authentification. Veuillez réessayer.");
          break;
        case FC_ERROR_MAPPING.server_error:
          setFcError("FranceConnect est temporairement indisponible.");
          break;
        case FC_ERROR_MAPPING.fc_auth_failed:
          setFcError("Échec de l'authentification FranceConnect.");
          break;
        default:
          setFcError("Une erreur est survenue avec FranceConnect.");
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(password);
  };

  const handleFranceConnect = () => {
    // Rediriger vers l'API FranceConnect
    window.location.href = "/api/auth/fc/login";
  };

  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container [&_h2]:text-[var(--text-title-grey)]! [&_h2]:mt-10!">
        <div className="fr-container fr-container--fluid fr-mb-md-14v">
          <div className="fr-grid-row fr-grid-row-gutters fr-grid-row--center">
            <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
              <div className="fr-container fr-background-alt--grey fr-px-md-0 fr-py-10v fr-py-md-14v">
                <div className="fr-grid-row fr-grid-row-gutters fr-grid-row--center">
                  <div className="fr-col-12 fr-col-md-9 fr-col-lg-8">
                    <h1>{contentConnexionPage.title}</h1>

                    {/* Alerte erreur FranceConnect */}
                    {fcError && (
                      <div className="fr-alert fr-alert--error fr-mb-4w">
                        <p className="fr-alert__title">Erreur FranceConnect</p>
                        <p>{fcError}</p>
                        <button
                          className="fr-btn--close fr-btn"
                          title="Masquer le message"
                          onClick={() => setFcError(null)}
                        >
                          Masquer le message
                        </button>
                      </div>
                    )}

                    {/* FranceConnect - ACTIVÉ */}
                    <div className="fr-mb-6v">
                      <h2>{contentConnexionPage.franceConnect.title}</h2>
                      <div className="fr-connect-group">
                        <button
                          className="fr-connect"
                          onClick={handleFranceConnect}
                          type="button"
                        >
                          <span className="fr-connect__login">
                            {contentConnexionPage.franceConnect.connectLogin}
                          </span>
                          <span className="fr-connect__brand">
                            {contentConnexionPage.franceConnect.connectBrand}
                          </span>
                        </button>
                        <p className="fr-text--sm fr-mt-2v">
                          <a
                            href="https://franceconnect.gouv.fr/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="fr-link"
                          >
                            Qu'est-ce que FranceConnect ?
                          </a>
                        </p>
                      </div>
                    </div>

                    <p className="fr-hr-or">{contentConnexionPage.or}</p>

                    {/* Formulaire de connexion admin */}
                    <div>
                      <form id="login-admin" onSubmit={handleSubmit}>
                        <fieldset
                          className="fr-fieldset"
                          id="login-fieldset"
                          aria-labelledby="login-fieldset-legend login-fieldset-messages"
                        >
                          <legend
                            className="fr-fieldset__legend"
                            id="login-fieldset-legend"
                          >
                            <h2>Connexion administrateur</h2>
                          </legend>

                          <div className="fr-fieldset__element">
                            <p className="fr-text--sm">
                              Accès réservé aux administrateurs du site.
                            </p>
                          </div>

                          <div className="fr-fieldset__element">
                            <div
                              className={`fr-password ${error ? "fr-password--error" : ""}`}
                              id="password-admin"
                            >
                              <label
                                className="fr-label"
                                htmlFor="password-input"
                              >
                                Mot de passe administrateur
                                <span className="fr-hint-text">
                                  Saisissez le mot de passe fourni par l'équipe
                                </span>
                              </label>
                              <div className="fr-input-wrap">
                                <input
                                  className="fr-password__input fr-input"
                                  aria-describedby={
                                    error ? "password-error" : "password-hint"
                                  }
                                  aria-required="true"
                                  name="password"
                                  autoComplete="current-password"
                                  id="password-input"
                                  type={showPassword ? "text" : "password"}
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  disabled={isLoading}
                                />
                              </div>

                              {error && (
                                <p
                                  id="password-error"
                                  className="fr-error-text"
                                >
                                  {error}
                                </p>
                              )}

                              <div className="fr-password__checkbox fr-checkbox-group fr-checkbox-group--sm">
                                <input
                                  aria-label="Afficher le mot de passe"
                                  id="password-show"
                                  type="checkbox"
                                  checked={showPassword}
                                  onChange={(e) =>
                                    setShowPassword(e.target.checked)
                                  }
                                />
                                <label
                                  className="fr-password__checkbox fr-label"
                                  htmlFor="password-show"
                                >
                                  {contentConnexionPage.passwordShow}
                                </label>
                              </div>
                            </div>
                          </div>

                          <div className="fr-fieldset__element">
                            <ul className="fr-btns-group">
                              <li>
                                <button
                                  className="fr-mt-2v fr-btn"
                                  type="submit"
                                  disabled={isLoading || !password}
                                >
                                  {isLoading
                                    ? "Connexion..."
                                    : contentConnexionPage.connect}
                                </button>
                              </li>
                            </ul>
                          </div>
                        </fieldset>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
