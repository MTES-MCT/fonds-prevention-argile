"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { parseRGAParams } from "@/lib/form-rga/parser";
import { useRGAContext } from "@/lib/form-rga/session";
import { useConvertSearchParams } from "@/hooks/useConvertSearchParams";
import { DebugRGA } from "@/components/debug/DebugRGA";
import Link from "next/link";

interface DemandePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type ProcessingState =
  | "loading"
  | "success"
  | "error"
  | "no-data"
  | "session-error";

const REDIRECT_DELAY_MS = 1000; // Délai avant redirection automatique

export default function DemandePage({ searchParams }: DemandePageProps) {
  const router = useRouter();
  const { saveRGA, validateRGAData } = useRGAContext();
  const urlSearchParams = useConvertSearchParams(searchParams);

  const [processingState, setProcessingState] =
    useState<ProcessingState>("loading");
  const [errors, setErrors] = useState<string[]>([]);

  // Parser les données RGA
  const rgaData = parseRGAParams(urlSearchParams);

  useEffect(() => {
    // Éviter les re-exécutions multiples
    if (processingState !== "loading") return;

    // Fonction pour traiter les données RGA
    const processRGAData = async () => {
      // 1. Vérifier si des paramètres RGA sont présents
      if (Object.keys(rgaData).length === 0) {
        console.warn("Aucun paramètre RGA trouvé");
        setProcessingState("no-data");
        return;
      }

      // 2. Valider les données RGA
      const validationErrors = validateRGAData(rgaData);

      if (validationErrors.length > 0) {
        console.warn("Erreurs de validation RGA:", validationErrors);
        setErrors(validationErrors);
        setProcessingState("error");
        return;
      }

      // 3. Sauvegarder en session
      const success = saveRGA(rgaData);

      if (!success) {
        console.error("Échec de la sauvegarde en session");
        setProcessingState("session-error");
        return;
      }

      setProcessingState("success");

      // 4. Redirection automatique
      setTimeout(() => {
        router.push("/connexion");
      }, REDIRECT_DELAY_MS);
    };

    // Traitement automatique au montage du composant
    processRGAData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dépendances vides pour éviter les re-exécutions

  const renderContent = () => {
    switch (processingState) {
      case "no-data":
        return (
          <div className="fr-grid-row fr-grid-row--center">
            <div className="fr-col-12 fr-col-md-8">
              <div className="fr-alert fr-alert--error">
                <h2 className="fr-alert__title">Aucune donnée reçue</h2>
                <p>
                  Aucun paramètre RGA n'a été trouvé dans votre demande. Vous
                  devez d'abord remplir le simulateur pour accéder à cette page.
                </p>
              </div>

              <div className="fr-btns-group fr-mt-4w">
                <Link href="/" className="fr-btn fr-btn--primary">
                  Retour à l'accueil
                </Link>
              </div>
            </div>
          </div>
        );

      case "session-error":
      case "error":
        return (
          <div className="fr-grid-row fr-grid-row--center">
            <div className="fr-col-12 fr-col-md-8">
              <div className="fr-alert fr-alert--error">
                <h2 className="fr-alert__title">Erreur de sauvegarde</h2>
                <p>
                  Une erreur s'est produite lors de la sauvegarde de vos
                  données. Veuillez réessayer ou contacter le support si le
                  problème persiste.
                </p>
              </div>

              <div className="fr-btns-group fr-mt-4w">
                <button
                  className="fr-btn fr-btn--primary"
                  onClick={() => (window.location.href = "/simulateur")}
                >
                  Réessayer
                </button>
                <Link href="/" className="fr-btn fr-btn--secondary">
                  Retour à l'accueil
                </Link>
              </div>
            </div>
          </div>
        );

      case "loading":
      case "success":
        return (
          <div className="fr-grid-row fr-grid-row--center">
            <div className="fr-col-12 fr-col-md-8">
              {errors.length > 0 && (
                <div className="fr-alert fr-alert--warning fr-mt-2w">
                  <h3 className="fr-alert__title">Avertissements détectés</h3>
                  <ul>
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                  <p>
                    Ces informations manquantes pourront être complétées plus
                    tard.
                  </p>
                </div>
              )}

              <div className="fr-callout fr-mt-4w">
                <p>
                  Redirection automatique vers la connexion dans quelques
                  secondes...
                </p>
                <div className="fr-btns-group fr-mt-2w">
                  <button
                    className="fr-btn fr-btn--primary"
                    onClick={() => router.push("/connexion")}
                    disabled={processingState !== "success"}
                  >
                    Continuer maintenant
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
    }
  };

  return (
    <div>
      <DebugRGA urlSearchParams={urlSearchParams} rgaData={rgaData} />
      <div className="fr-container fr-my-4w">{renderContent()}</div>
    </div>
  );
}
