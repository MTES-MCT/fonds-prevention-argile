"use client";

import { useState, useEffect } from "react";
import type { AlerteTendance } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

interface AlertesTendancesProps {
  alertes: AlerteTendance[];
}

/**
 * Affiche les alertes de tendances (motifs en hausse, etc.)
 *
 * Chaque alerte est fermable individuellement.
 * L'état de fermeture se réinitialise quand les alertes changent
 * (changement de filtre période/département).
 */
export function AlertesTendances({ alertes }: AlertesTendancesProps) {
  const [dismissed, setDismissed] = useState(false);

  // Réinitialiser l'état de fermeture quand les alertes changent
  useEffect(() => {
    setDismissed(false);
  }, [alertes]);

  if (dismissed || alertes.length === 0) {
    return null;
  }

  return (
    <div className="fr-container fr-py-2w">
      {alertes.map((alerte, index) => (
        <div
          key={index}
          className="fr-alert fr-alert--warning fr-alert--sm"
          role="alert"
          style={{ position: "relative" }}>
          <p className="fr-mb-0">{alerte.message}</p>
          <button
            type="button"
            className="fr-btn--close fr-btn"
            aria-label="Masquer le message"
            onClick={() => setDismissed(true)}
            style={{
              position: "absolute",
              top: "50%",
              right: "0.75rem",
              transform: "translateY(-50%)",
            }}>
            Masquer
          </button>
        </div>
      ))}
    </div>
  );
}
