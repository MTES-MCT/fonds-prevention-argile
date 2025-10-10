"use client";

import { contentConnexionPage } from "@/content";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { FC_ERROR_MAPPING } from "@/lib/auth/client";
import { useRGAContext } from "@/lib/form-rga/session";

export default function ConnexionFranceConnectClient() {
  const [fcError, setFcError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const { data: rgaData } = useRGAContext();

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

  const handleFranceConnect = () => {
    // Récupérer le code INSEE depuis les données RGA
    const codeInsee = rgaData?.logement?.commune;

    // Stocker le code INSEE en cookie si disponible
    if (codeInsee) {
      document.cookie = `fc_code_insee=${codeInsee}; path=/; max-age=300; SameSite=Lax`;
    } else {
      console.warn("Aucun code INSEE trouvé dans les données RGA");
    }

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
                      <p className="fr-mb-4v">
                        {contentConnexionPage.franceConnect.description}
                      </p>
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
