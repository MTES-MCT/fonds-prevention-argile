"use client";

import { PartialRGAFormData } from "@/features/simulateur-rga";

interface DebugRGAProps {
  urlSearchParams: URLSearchParams;
  rgaData: PartialRGAFormData;
  hasSessionData?: boolean;
}

export function DebugRGA({
  urlSearchParams,
  rgaData,
  hasSessionData,
}: DebugRGAProps) {
  // Ne s'affiche qu'en développement local
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div
      className="fr-container fr-my-4w"
      style={{
        backgroundColor: "#f0f0f0",
        padding: "20px",
        border: "2px solid #ccc",
      }}
    >
      <h2>DEBUG RGA (développement uniquement)</h2>

      <details className="fr-mb-4w">
        <summary>Paramètres bruts reçus</summary>
        <pre className="fr-text--xs">
          {JSON.stringify(Object.fromEntries(urlSearchParams), null, 2)}
        </pre>
      </details>

      <details className="fr-mb-4w">
        <summary>Données RGA parsées</summary>
        <pre className="fr-text--xs">{JSON.stringify(rgaData, null, 2)}</pre>
      </details>

      <div className="fr-alert fr-alert--info">
        <p>
          <strong>Session :</strong>{" "}
          {hasSessionData ? "Données présentes" : "Pas de données"}
        </p>
      </div>
    </div>
  );
}
