import { contentConnexionPage } from "@/content";

export default function Connexion() {
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
                    <div className="fr-mb-6v">
                      <h2>{contentConnexionPage.franceConnect.title}</h2>
                      <div className="fr-connect-group">
                        <button className="fr-connect">
                          <span className="fr-connect__login">
                            {contentConnexionPage.franceConnect.connectLogin}
                          </span>
                          <span className="fr-connect__brand">
                            {contentConnexionPage.franceConnect.connectBrand}
                          </span>
                        </button>
                        <p>
                          <a
                            href="https://franceconnect.gouv.fr/"
                            target="_blank"
                            rel="noopener"
                            title={
                              contentConnexionPage.franceConnect.whatIsNewWindow
                            }
                          >
                            {contentConnexionPage.franceConnect.whatIs}
                          </a>
                        </p>
                      </div>
                    </div>
                    <p className="fr-hr-or">{contentConnexionPage.or}</p>
                    <div>
                      <form id="login-1760">
                        <fieldset
                          className="fr-fieldset"
                          id="login-fieldset"
                          aria-labelledby="login-fieldset-legend login-fieldset-messages"
                        >
                          <legend
                            className="fr-fieldset__legend"
                            id="login-fieldset-legend"
                          >
                            <h2>{contentConnexionPage.connectWithAccount}</h2>
                          </legend>
                          <div className="fr-fieldset__element">
                            <p className="fr-text--sm">
                              {contentConnexionPage.description}
                            </p>
                          </div>
                          <div className="fr-fieldset__element">
                            <fieldset
                              className="fr-fieldset"
                              id="credentials"
                              aria-labelledby="credentials-messages"
                            >
                              <div className="fr-fieldset__element">
                                <span className="fr-hint-text">
                                  {contentConnexionPage.mandatoryFieldsText}
                                </span>
                              </div>
                              <div className="fr-fieldset__element">
                                <div className="fr-input-group">
                                  <label
                                    className="fr-label"
                                    htmlFor="username-1757"
                                  >
                                    {contentConnexionPage.login}
                                    <span className="fr-hint-text">
                                      {contentConnexionPage.loginFormat}
                                    </span>
                                  </label>
                                  <input
                                    className="fr-input"
                                    autoComplete="username"
                                    aria-required="true"
                                    aria-describedby="username-messages"
                                    name="username"
                                    id="username-1757"
                                    type="text"
                                  />
                                  <div
                                    className="fr-messages-group"
                                    id="username-messages"
                                    aria-live="assertive"
                                  ></div>
                                </div>
                              </div>
                              <div className="fr-fieldset__element">
                                <div className="fr-password" id="password-1758">
                                  <label
                                    className="fr-label"
                                    htmlFor="password-input"
                                  >
                                    {contentConnexionPage.password}
                                  </label>
                                  <div className="fr-input-wrap">
                                    <input
                                      className="fr-password__input fr-input"
                                      aria-describedby="password-input-messages"
                                      aria-required="true"
                                      name="password"
                                      autoComplete="current-password"
                                      id="password-input"
                                      type="password"
                                    />
                                  </div>
                                  <div
                                    className="fr-messages-group"
                                    id="password-1758-input-messages"
                                    aria-live="assertive"
                                  ></div>
                                  <div className="fr-password__checkbox fr-checkbox-group fr-checkbox-group--sm">
                                    <input
                                      aria-label="Afficher le mot de passe"
                                      id="password-1758-show"
                                      type="checkbox"
                                      aria-describedby="password-1758-show-messages"
                                    />
                                    <label
                                      className="fr-password__checkbox fr-label"
                                      htmlFor="password-1758-show"
                                    >
                                      {contentConnexionPage.passwordShow}
                                    </label>
                                    <div
                                      className="fr-messages-group"
                                      id="password-1758-show-messages"
                                      aria-live="assertive"
                                    ></div>
                                  </div>
                                  <p>
                                    <a
                                      href={
                                        contentConnexionPage.forgotPasswordLink
                                      }
                                      className="fr-link"
                                    >
                                      {contentConnexionPage.forgotPassword}
                                    </a>
                                  </p>
                                </div>
                              </div>
                              <div
                                className="fr-messages-group"
                                id="credentials-messages"
                                aria-live="assertive"
                              ></div>
                            </fieldset>
                          </div>
                          <div className="fr-fieldset__element">
                            <div className="fr-checkbox-group fr-checkbox-group--sm">
                              <input
                                name="remember"
                                id="remember"
                                type="checkbox"
                                aria-describedby="remember-messages"
                              />
                              <label className="fr-label" htmlFor="remember">
                                {contentConnexionPage.rememberMe}
                              </label>
                              <div
                                className="fr-messages-group"
                                id="remember-messages"
                                aria-live="assertive"
                              ></div>
                            </div>
                          </div>
                          <div className="fr-fieldset__element">
                            <ul className="fr-btns-group">
                              <li>
                                <button className="fr-mt-2v fr-btn">
                                  {contentConnexionPage.connect}
                                </button>
                              </li>
                            </ul>
                          </div>
                          <div
                            className="fr-messages-group"
                            id="login-fieldset-messages"
                            aria-live="assertive"
                          ></div>
                        </fieldset>
                      </form>
                    </div>
                    <hr />
                    <h2>{contentConnexionPage.dontHaveAccount}</h2>
                    <ul className="fr-btns-group">
                      <li>
                        <button className="fr-btn fr-btn--secondary">
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
    </section>
  );
}
