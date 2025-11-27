"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import content from "../content/content.json";
import { ROUTES } from "@/features/auth/client";

export default function ConnexionProConnectClient() {
  const [pcError, setPcError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Gérer les erreurs ProConnect depuis l'URL
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      switch (errorParam) {
        case "access_denied":
          setPcError("Vous avez annulé la connexion ProConnect.");
          break;
        case "pc_security_error":
          setPcError("Erreur de sécurité. Veuillez réessayer.");
          break;
        case "pc_init_failed":
          setPcError("Erreur lors de l'initialisation. Veuillez réessayer.");
          break;
        case "pc_missing_params":
          setPcError("Erreur lors de l'authentification. Veuillez réessayer.");
          break;
        case "server_error":
          setPcError("ProConnect est temporairement indisponible.");
          break;
        case "pc_auth_failed":
          setPcError("Échec de l'authentification ProConnect.");
          break;
        default:
          setPcError("Une erreur est survenue avec ProConnect.");
      }
    }
  }, [searchParams]);

  const handleProConnect = () => {
    // Rediriger vers l'API ProConnect
    window.location.href = ROUTES.api.auth.pc.login;
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
                    <h1>{content.title}</h1>

                    {/* Alerte erreur ProConnect */}
                    {pcError && (
                      <div className="fr-alert fr-alert--error fr-mb-4w">
                        <p className="fr-alert__title">Erreur ProConnect</p>
                        <p>{pcError}</p>
                        <button
                          className="fr-btn--close fr-btn"
                          title="Masquer le message"
                          onClick={() => setPcError(null)}>
                          Masquer le message
                        </button>
                      </div>
                    )}

                    {/* ProConnect */}
                    <div className="fr-mb-6v">
                      <h2>{content.proConnect.title}</h2>
                      <p className="fr-mb-4v">{content.proConnect.description}</p>
                      <div className="fr-connect-group">
                        <button className="fr-connect pc-connect" onClick={handleProConnect} type="button">
                          <span className="fr-connect__login">{content.proConnect.connectLogin}</span>
                          <span className="fr-connect__brand">{content.proConnect.connectBrand}</span>
                        </button>
                        <p className="fr-text--sm fr-mt-2v">
                          <a
                            href="https://www.proconnect.gouv.fr/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="fr-link">
                            Qu'est-ce que ProConnect ?
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
