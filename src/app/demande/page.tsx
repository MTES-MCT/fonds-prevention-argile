"use client";

import { redirect } from "next/navigation";
import { parseRGAParams } from "@/lib/form-rga/parser";
import { useRGAContext } from "@/lib/form-rga/session";
import { useConvertSearchParams } from "@/hooks/useConvertSearchParams";

interface DemandePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function DemandePage({ searchParams }: DemandePageProps) {
  // Context RGA et hook pour convertir searchParams
  const { saveRGA, hasData } = useRGAContext();
  const urlSearchParams = useConvertSearchParams(searchParams);

  // Parser les données RGA
  const rgaData = parseRGAParams(urlSearchParams);

  // Debug: afficher les paramètres en console
  console.log("=== PARAMÈTRES RGA REÇUS ===");
  console.log("Paramètres bruts:", Object.fromEntries(urlSearchParams));
  console.log("Données parsées (RGAFormData):", rgaData);
  console.log("Données déjà en session:", hasData);
  console.log("============================");

  // Si pas de paramètres RGA, rediriger vers l'accueil
  if (Object.keys(rgaData).length === 0) {
    console.warn("Aucun paramètre RGA trouvé, redirection vers accueil");
    redirect("/");
  }

  // Sauvegarder et continuer
  const handleSaveAndContinue = () => {
    const success = saveRGA(rgaData);
    if (success) {
      console.log("Données sauvées en session avec structure RGAFormData");
      // TODO: Rediriger vers la page de connexion FranceConnect
      console.log("TODO: Redirection vers /connexion");
      // Pour le moment, redirection vers la page de test
      window.location.href = "/demande/test";
    } else {
      console.error("Erreur lors de la sauvegarde en session");
    }
  };

  return (
    <div className="fr-container fr-my-4w">
      <div className="fr-grid-row fr-grid-row--center">
        <div className="fr-col-12 fr-col-md-8">
          <h1>Récupération des données RGA</h1>

          <div className="fr-alert fr-alert--info fr-mb-4w">
            <h2 className="fr-alert__title">Données reçues du simulateur</h2>
            <p>
              Vos données ont été récupérées depuis le simulateur RGA. Elles
              vont être sauvegardées en session puis vous serez redirigé vers la
              page de connexion.
            </p>
          </div>

          {/* Résumé des données importantes */}
          <div className="fr-callout fr-mb-4w">
            <h3 className="fr-callout__title">Données récupérées :</h3>
            <ul>
              {rgaData.logement?.adresse && (
                <li>
                  <strong>Adresse :</strong> {rgaData.logement.adresse}
                </li>
              )}
              {rgaData.menage?.revenu && (
                <li>
                  <strong>Revenu :</strong> {rgaData.menage.revenu}€
                </li>
              )}
              {rgaData.menage?.personnes && (
                <li>
                  <strong>Personnes :</strong> {rgaData.menage.personnes}
                </li>
              )}
              {rgaData.logement?.type && (
                <li>
                  <strong>Type logement :</strong> {rgaData.logement.type}
                </li>
              )}
              {rgaData.rga?.assure !== undefined && (
                <li>
                  <strong>Assuré RGA :</strong>{" "}
                  {rgaData.rga.assure ? "Oui" : "Non"}
                </li>
              )}
            </ul>
          </div>

          {/* Debug info (à supprimer en production) */}
          <details className="fr-mb-4w">
            <summary>Détails techniques (debug)</summary>
            <div className="fr-mt-2w">
              <h3>Structure RGAFormData parsée :</h3>
              <pre className="fr-text--xs">
                {JSON.stringify(rgaData, null, 2)}
              </pre>
            </div>
          </details>

          <div className="fr-btns-group">
            <button
              className="fr-btn fr-btn--primary"
              onClick={handleSaveAndContinue}
            >
              Sauvegarder en session et continuer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
