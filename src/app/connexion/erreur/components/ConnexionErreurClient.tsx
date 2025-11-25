"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ERROR_MESSAGES: Record<string, { title: string; message: string; suggestion: string }> = {
  pc_security_error: {
    title: "Erreur de sécurité",
    message: "La session de connexion a expiré ou est invalide.",
    suggestion: "Veuillez réessayer de vous connecter.",
  },
  pc_auth_failed: {
    title: "Échec de l'authentification",
    message: "ProConnect n'a pas pu valider votre identité.",
    suggestion: "Vérifiez vos identifiants et réessayez.",
  },
  pc_missing_params: {
    title: "Paramètres manquants",
    message: "La requête d'authentification est incomplète.",
    suggestion: "Veuillez réessayer depuis le début.",
  },
  access_denied: {
    title: "Connexion annulée",
    message: "Vous avez annulé la connexion avec ProConnect.",
    suggestion: "Vous pouvez réessayer quand vous le souhaitez.",
  },
  server_error: {
    title: "Service temporairement indisponible",
    message: "ProConnect rencontre des difficultés techniques.",
    suggestion: "Veuillez réessayer dans quelques instants.",
  },
  default: {
    title: "Erreur de connexion",
    message: "Une erreur inattendue s'est produite.",
    suggestion: "Veuillez réessayer ou contacter le support si le problème persiste.",
  },
};

export default function ConnexionErreurClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [errorInfo, setErrorInfo] = useState(ERROR_MESSAGES.default);

  useEffect(() => {
    const errorCode = searchParams.get("error");
    if (errorCode && ERROR_MESSAGES[errorCode]) {
      setErrorInfo(ERROR_MESSAGES[errorCode]);
    }
  }, [searchParams]);

  const handleRetry = () => {
    router.push("/connexion/agent");
  };

  const handleGoHome = () => {
    router.push("/");
  };

  return (
    <section className="fr-container-fluid fr-py-10w">
      <div className="fr-container">
        <div className="fr-grid-row fr-grid-row-gutters fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-6">
            <div className="fr-container fr-background-alt--grey fr-px-md-6 fr-py-10v">
              <div className="fr-grid-row fr-grid-row-gutters fr-grid-row--center">
                <div className="fr-col-12">
                  {/* Icône d'erreur */}
                  <div className="fr-mb-6v fr-text--center">
                    <span
                      className="fr-icon-error-warning-line fr-icon--lg"
                      aria-hidden="true"
                      style={{ fontSize: "4rem", color: "var(--error-425-625)" }}
                    />
                  </div>

                  <h1 className="fr-text--center">{errorInfo.title}</h1>

                  <div className="fr-alert fr-alert--error fr-mb-4w">
                    <p className="fr-alert__title">{errorInfo.message}</p>
                    <p>{errorInfo.suggestion}</p>
                  </div>

                  {/* Actions */}
                  <div className="fr-btns-group fr-btns-group--center">
                    <button className="fr-btn" onClick={handleRetry} type="button">
                      Réessayer de se connecter
                    </button>
                    <button className="fr-btn fr-btn--secondary" onClick={handleGoHome} type="button">
                      Retour à l'accueil
                    </button>
                  </div>

                  {/* Aide */}
                  <div className="fr-mt-6v fr-text--center">
                    <p className="fr-text--sm">
                      Besoin d'aide ?{" "}
                      <a href="mailto:fonds-prevention-argile@beta.gouv.fr" className="fr-link">
                        Contactez-nous
                      </a>
                    </p>
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
