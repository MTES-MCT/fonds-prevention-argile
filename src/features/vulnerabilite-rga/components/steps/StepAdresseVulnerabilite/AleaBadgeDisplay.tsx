"use client";

import { ALEA_COLORS } from "@/features/rga-map";
import type { ReponseAleaRga } from "../../../domain/types/vulnerabilite-reponses.types";

interface AleaBadgeDisplayProps {
  adresse: string;
  aleaRga: ReponseAleaRga;
}

const ALEA_LABELS: Record<ReponseAleaRga, string> = {
  fort: "Aléa fort",
  moyen: "Aléa moyen",
  faible: "Aléa faible",
  nul: "Hors zone argileuse",
};

/**
 * Affichage non éditable de l'adresse sélectionnée + son aléa RGA (issu de la carte).
 * Contrairement au simulateur d'éligibilité, aucune correction manuelle (année de
 * construction, niveaux) n'est nécessaire ici : ce simulateur ne pose aucune question
 * sur le bâtiment.
 */
export function AleaBadgeDisplay({ adresse, aleaRga }: AleaBadgeDisplayProps) {
  const color = aleaRga === "nul" ? "#E5E5E5" : ALEA_COLORS[aleaRga];

  return (
    <div className="fr-mt-2w px-2 py-1">
      <p className="fr-text--bold fr-mb-1v">{adresse}</p>
      <span className="fr-badge fr-badge--sm" style={{ backgroundColor: color, color: "#161616" }}>
        {ALEA_LABELS[aleaRga]}
      </span>
    </div>
  );
}
