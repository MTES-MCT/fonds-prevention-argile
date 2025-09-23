"use client";

import { contentSimulationPage } from "@/content";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { parseRGAParams } from "@/lib/form-rga/parser";
import { useRGAContext } from "@/lib/form-rga/session";

interface RGAMessage {
  type: string;
  searchParams: string;
}

type ProcessingState = "idle" | "processing" | "success" | "error";

const REDIRECT_DELAY_MS = 1000;

export default function Simulateur() {
  const router = useRouter();
  const { saveRGA, validateRGAData } = useRGAContext();
  const isProcessingRef = useRef(false); // Référence pour suivre l'état de traitement

  // État pour gérer le traitement
  const [processingState, setProcessingState] =
    useState<ProcessingState>("idle");
  const [processingErrors, setProcessingErrors] = useState<string[]>([]);

  // Variables d'environnement
  const iframeUrl = process.env.NEXT_PUBLIC_MESAIDES_RENOV_IFRAME_URL;
  const iframeHeight = process.env.NEXT_PUBLIC_MESAIDES_RENOV_IFRAME_HEIGHT;

  // Extraire l'origine de l'URL de l'iframe
  const iframeOrigin = iframeUrl ? new URL(iframeUrl).origin : null;

  // Liste des origines autorisées pour l'iframe
  const IFRAME_ALLOWED_ORIGINS = [
    iframeOrigin,
    "https://mesaides.renov.gouv.fr",
  ].filter(Boolean);

  useEffect(() => {
    // Fonction pour traiter les données RGA reçues
    const processRGAData = async (searchParamsString: string) => {
      setProcessingState("processing");
      setProcessingErrors([]);

      try {
        // 1. Créer URLSearchParams directement
        const urlSearchParams = new URLSearchParams(searchParamsString);

        // 2. Parser les données RGA
        const rgaData = parseRGAParams(urlSearchParams);

        // 3. Vérifier si des paramètres RGA sont présents
        if (Object.keys(rgaData).length === 0) {
          setProcessingErrors([
            "Aucun paramètre RGA trouvé dans les données reçues",
          ]);
          setProcessingState("error");
          return;
        }

        // 4. Valider les données RGA
        const validationErrors = validateRGAData(rgaData);

        if (validationErrors.length > 0) {
          setProcessingErrors(validationErrors);
          // On continue même avec des erreurs de validation (données partielles)
        }

        // 5. Sauvegarder en session
        const success = saveRGA(rgaData);

        if (!success) {
          setProcessingErrors([
            "Échec de la sauvegarde des données en session",
          ]);
          setProcessingState("error");
          return;
        }

        setProcessingState("success");
        isProcessingRef.current = true; // Marquer comme en cours de redirection

        // 6. Redirection automatique vers la page de connexion
        setTimeout(() => {
          router.push("/connexion");
        }, REDIRECT_DELAY_MS);
      } catch (error) {
        console.error("Erreur lors du traitement des données RGA:", error);
        setProcessingErrors(["Une erreur inattendue s'est produite"]);
        setProcessingState("error");
      }
    };

    // Fonction pour gérer les messages de l'iframe
    const handleIframeMessage = (event: MessageEvent<RGAMessage>) => {
      // Ignorer les messages pendant la redirection
      if (isProcessingRef.current) return;

      // Vérification de sécurité de l'origine
      if (!IFRAME_ALLOWED_ORIGINS.includes(event.origin)) {
        return;
      }

      // Vérification du type de message
      if (event.data.type === "RGA_DEMANDE_AIDE") {
        // Traiter les données RGA
        processRGAData(event.data.searchParams);
      }
    };

    // Ajout de l'écouteur d'événements
    window.addEventListener("message", handleIframeMessage);

    // Nettoyage lors du démontage du composant
    return () => {
      window.removeEventListener("message", handleIframeMessage);
    };
  }, [IFRAME_ALLOWED_ORIGINS, router, saveRGA, validateRGAData]);

  // Modal ou notification de traitement
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
                <div className="fr-mt-2w" style={{ textAlign: "center" }}>
                  <span className="fr-loader" aria-label="Chargement"></span>
                </div>
              </div>
            )}

            {processingState === "success" && (
              <div>
                <h2 className="fr-h3">Données enregistrées</h2>
                <p>Vos données ont été enregistrées avec succès.</p>
                <p className="fr-text--sm fr-mt-1w">
                  Redirection automatique vers la connexion...
                </p>
                <button
                  className="fr-btn fr-btn--primary fr-mt-2w"
                  onClick={() => router.push("/connexion")}
                >
                  Continuer maintenant
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
                    {contentSimulationPage.breadcrumb.home}
                  </Link>
                </li>
                <li>
                  <a className="fr-breadcrumb__link" aria-current="page">
                    {contentSimulationPage.breadcrumb.simulation}
                  </a>
                </li>
              </ol>
            </div>
          </nav>

          <h1 className="fr-mb-6w text-[var(--text-title-grey)]!">
            {contentSimulationPage.title}
          </h1>

          {/* Conditional rendering de l'iframe */}
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
              nous contacter via le formulaire de contact ou consulter notre
              FAQ.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
