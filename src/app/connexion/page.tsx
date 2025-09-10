"use client";

import { contentConnexionPage } from "@/content";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function Connexion() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoading, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(password);
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

                    {/* FranceConnect - Désactivé temporairement */}
                    <div
                      className="fr-mb-6v"
                      style={{ opacity: 0.5, pointerEvents: "none" }}
                    >
                      <h2>{contentConnexionPage.franceConnect.title}</h2>
                      <div className="fr-connect-group">
                        <button className="fr-connect" disabled>
                          <span className="fr-connect__login">
                            {contentConnexionPage.franceConnect.connectLogin}
                          </span>
                          <span className="fr-connect__brand">
                            {contentConnexionPage.franceConnect.connectBrand}
                          </span>
                        </button>
                        <p className="fr-text--sm fr-mt-2v">
                          <em>Disponible prochainement</em>
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

                          {/* Alerte Beta */}
                          <div className="fr-alert fr-alert--info fr-mb-3w">
                            <p className="fr-alert__title">Version Beta</p>
                            <p>
                              Connexion simplifiée pour la phase de test.
                              ProConnect sera disponible prochainement.
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

                    <hr />

                    {/* Section création de compte - Désactivée */}
                    <div style={{ opacity: 0.5 }}>
                      <h2>{contentConnexionPage.dontHaveAccount}</h2>
                      <p className="fr-text--sm">
                        La création de compte sera disponible avec ProConnect.
                      </p>
                      <ul className="fr-btns-group">
                        <li>
                          <button className="fr-btn fr-btn--secondary" disabled>
                            {contentConnexionPage.createAccount}
                          </button>
                        </li>
                      </ul>
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
