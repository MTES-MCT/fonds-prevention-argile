"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import RGATestFiller from "./debug/RGATestFiller";
import { useRGAContext } from "../context";
import { parseRGAParams } from "../services/parser.service";

interface RGAMessage {
  type: string;
  searchParams: string;
}

type ProcessingState = "idle" | "processing" | "success" | "error";

const REDIRECT_DELAY_MS = 1000;

export default function SimulateurClient() {
  const router = useRouter();
  const { saveRGA, validateRGAData } = useRGAContext();
  const isProcessingRef = useRef(false);

  const [processingState, setProcessingState] =
    useState<ProcessingState>("idle");
  const [processingErrors, setProcessingErrors] = useState<string[]>([]);

  const iframeUrl = process.env.NEXT_PUBLIC_MESAIDES_RENOV_IFRAME_URL;
  const iframeHeight = process.env.NEXT_PUBLIC_MESAIDES_RENOV_IFRAME_HEIGHT;
  const iframeOrigin = iframeUrl ? new URL(iframeUrl).origin : null;

  const IFRAME_ALLOWED_ORIGINS = [
    iframeOrigin,
    "https://mesaides.renov.gouv.fr",
  ].filter(Boolean);

  useEffect(() => {
    const processRGAData = async (searchParamsString: string) => {
      setProcessingState("processing");
      setProcessingErrors([]);

      try {
        const urlSearchParams = new URLSearchParams(searchParamsString);
        const rgaData = parseRGAParams(urlSearchParams);

        if (Object.keys(rgaData).length === 0) {
          setProcessingErrors([
            "Aucun paramètre RGA trouvé dans les données reçues",
          ]);
          setProcessingState("error");
          return;
        }

        const validationErrors = validateRGAData(rgaData);
        if (validationErrors.length > 0) {
          setProcessingErrors(validationErrors);
        }

        const success = saveRGA(rgaData);
        if (!success) {
          setProcessingErrors([
            "Échec de la sauvegarde des données en session",
          ]);
          setProcessingState("error");
          return;
        }

        setProcessingState("success");
        isProcessingRef.current = true;

        setTimeout(() => {
          router.push("/connexion");
        }, REDIRECT_DELAY_MS);
      } catch (error) {
        console.error("Erreur lors du traitement des données RGA:", error);
        setProcessingErrors(["Une erreur inattendue s'est produite"]);
        setProcessingState("error");
      }
    };

    const handleIframeMessage = (event: MessageEvent<RGAMessage>) => {
      if (isProcessingRef.current) return;
      if (!IFRAME_ALLOWED_ORIGINS.includes(event.origin)) return;
      if (event.data.type === "RGA_DEMANDE_AIDE") {
        processRGAData(event.data.searchParams);
      }
    };

    window.addEventListener("message", handleIframeMessage);
    return () => {
      window.removeEventListener("message", handleIframeMessage);
    };
  }, [IFRAME_ALLOWED_ORIGINS, router, saveRGA, validateRGAData]);

  const renderProcessingOverlay = () => {
    if (processingState === "idle") return null;

    return (
      <div
        className="fr-modal"
        aria-label="Traitement des données"
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        <div className="fr-modal__body">
          <div
            className="fr-modal__content"
            style={{
              backgroundColor: "white",
              padding: "2rem",
              borderRadius: "8px",
              maxWidth: "500px",
              width: "90%",
            }}
          >
            {processingState === "processing" && (
              <div>
                <h2 className="fr-h3">Traitement en cours...</h2>
                <p>Veuillez patienter pendant que nous traitons vos données.</p>
                <p className="fr-text--sm fr-mt-1w">
                  Redirection automatique vers la connexion...
                </p>
                <div className="fr-mt-2w" style={{ textAlign: "center" }}>
                  <span className="fr-loader" aria-label="Chargement"></span>
                </div>
              </div>
            )}

            {processingState === "success" && (
              <div>
                <h2 className="fr-h3">Données enregistrées</h2>
                <p>Vos données ont été enregistrées avec succès.</p>
                <button
                  className="fr-btn fr-btn--primary fr-mt-2w"
                  onClick={() => router.push("/connexion")}
                >
                  Continuer
                </button>
              </div>
            )}

            {processingState === "error" && (
              <div>
                <h2 className="fr-h3">Erreur de traitement</h2>
                {processingErrors.length > 0 && (
                  <ul className="fr-mt-2w">
                    {processingErrors.map((error, index) => (
                      <li key={index} className="fr-text--sm">
                        {error}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="fr-btns-group fr-mt-3w">
                  <button
                    className="fr-btn fr-btn--secondary"
                    onClick={() => {
                      setProcessingState("idle");
                      setProcessingErrors([]);
                    }}
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Affichage normal du simulateur
  return (
    <>
      {renderProcessingOverlay()}

      <section className="fr-container-fluid fr-py-4w">
        <div className="fr-container">
          <nav
            role="navigation"
            className="fr-breadcrumb"
            aria-label="vous êtes ici :"
          >
            <button
              className="fr-breadcrumb__button"
              aria-expanded="false"
              aria-controls="breadcrumb"
            >
              Voir le fil d'Ariane
            </button>
            <div className="fr-collapse" id="breadcrumb">
              <ol className="fr-breadcrumb__list">
                <li>
                  <Link className="fr-breadcrumb__link" href="/">
                    Accueil
                  </Link>
                </li>
                <li>
                  <a className="fr-breadcrumb__link" aria-current="page">
                    Vérifier mon éligibilité
                  </a>
                </li>
              </ol>
            </div>
          </nav>

          <h1 className="fr-mb-6w text-[var(--text-title-grey)]!">
            Simulateur d'éligibilité au Fonds prévention argile
          </h1>

          <RGATestFiller />

          {iframeUrl ? (
            <iframe
              src={iframeUrl}
              title="Simulateur Mesaides Rénov'"
              className="w-full border-0 shadow-lg rounded-lg fr-mt-4w fr-mb-6w"
              style={{
                height: iframeHeight || "800px",
                minHeight: "600px",
              }}
              referrerPolicy="no-referrer-when-downgrade"
              aria-label="Simulateur d'éligibilité aux aides"
            />
          ) : (
            <div className="fr-alert fr-alert--error fr-mt-4w fr-mb-6w">
              <p>
                <strong>Erreur de configuration :</strong> L'URL du simulateur
                n'est pas définie. Variable d'environnement
                NEXT_PUBLIC_MESAIDES_RENOV_IFRAME_URL manquante.
              </p>
            </div>
          )}
        </div>

        <div className="fr-container">
          <noscript>
            <div className="fr-alert fr-alert--warning">
              <p>
                Le simulateur nécessite JavaScript pour fonctionner
                correctement.
              </p>
            </div>
          </noscript>

          <div className="fr-callout fr-mt-4w">
            <h3 className="fr-callout__title">Besoin d'aide ?</h3>
            <p className="fr-callout__text">
              Si vous rencontrez des difficultés avec le simulateur, vous pouvez
              nous contacter par mail à
              contact@fonds-prevention-argile.beta.gouv.fr ou via le tchat en
              bas à droite.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
