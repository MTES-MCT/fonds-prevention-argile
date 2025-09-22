"use client";

import { redirect } from "next/navigation";
import { use } from "react";
import { parseRGAParams } from "@/lib/form-rga/parser";

interface DemandePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function DemandePage({ searchParams }: DemandePageProps) {
  // Unwrap les searchParams avec React.use()
  const resolvedSearchParams = use(searchParams);

  // Convertir les searchParams en URLSearchParams
  const urlSearchParams = new URLSearchParams();

  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => urlSearchParams.append(key, v));
    } else if (value !== undefined) {
      urlSearchParams.append(key, value);
    }
  });

  // Parser les données RGA - FORMAT TYPÉ DIRECTEMENT !
  const rgaData = parseRGAParams(urlSearchParams);

  // Debug: afficher les paramètres en console
  console.log("=== PARAMÈTRES RGA REÇUS ===");
  console.log("Paramètres bruts:", Object.fromEntries(urlSearchParams));
  console.log("Données typées:", rgaData);
  console.log("============================");

  // Si pas de paramètres RGA, rediriger vers l'accueil
  if (Object.keys(rgaData).length === 0) {
    console.warn("Aucun paramètre RGA trouvé, redirection vers accueil");
    redirect("/");
  }

  return (
    <div className="fr-container fr-my-4w">
      <div className="fr-grid-row fr-grid-row--center">
        <div className="fr-col-12 fr-col-md-8">
          <h1>Récupération des données RGA</h1>

          <div className="fr-alert fr-alert--info fr-mb-4w">
            <h2 className="fr-alert__title">Données reçues du simulateur</h2>
            <p>
              Vos données ont été récupérées depuis le simulateur RGA. Vous
              allez être redirigé vers la page de connexion pour poursuivre
              votre demande.
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
            </ul>
          </div>

          {/* Debug info (à supprimer en production) */}
          <details className="fr-mb-4w">
            <summary>Détails techniques (debug)</summary>
            <div className="fr-mt-2w">
              <h3>Données typées :</h3>
              <pre className="fr-text--xs">
                {JSON.stringify(rgaData, null, 2)}
              </pre>
            </div>
          </details>

          <div className="fr-btns-group">
            <button
              className="fr-btn fr-btn--primary"
              onClick={() => {
                // TODO: Sauvegarder en session
                // TODO: Rediriger vers la page de connexion
                console.log(
                  "TODO: Mise en session et redirection vers connexion"
                );
                console.log("Données à sauver:", rgaData);
              }}
            >
              Continuer vers la connexion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
