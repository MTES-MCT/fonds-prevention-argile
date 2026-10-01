"use client";

import { getRgaRiskLevel, type BuildingData } from "@/shared/services/bdnb";
import { ALEA_COLORS } from "@/features/rga-map";

const ALEA_CONFIG = {
  fort: { label: "ALÉA FORT", bgColor: ALEA_COLORS.fort },
  moyen: { label: "ALÉA MOYEN", bgColor: ALEA_COLORS.moyen },
  faible: { label: "ALÉA FAIBLE", bgColor: ALEA_COLORS.faible },
  nul: { label: "HORS ZONE", bgColor: "var(--background-contrast-grey)" },
} as const;

interface BatimentSelectionneProps {
  batiment: BuildingData;
  /** Adresse recherchée, quand la BDNB n'en connaît pas pour ce bâtiment. */
  adresseRecherchee: string;
}

/** C'est l'adresse du bâtiment cliqué qui est enregistrée, pas celle recherchée : l'usager doit la voir. */
export function BatimentSelectionne({ batiment, adresseRecherchee }: BatimentSelectionneProps) {
  // Un aléa indéterminé n'est pas « hors zone » : pas de badge, l'alerte de la carte en parle.
  const alea = batiment.aleaIndetermine ? null : ALEA_CONFIG[getRgaRiskLevel(batiment.aleaArgiles)];

  return (
    <div className="flex flex-wrap items-center gap-2 fr-mt-2w" aria-live="polite">
      <span className="fr-badge fr-badge--success">{batiment.adresse || adresseRecherchee}</span>
      {alea && (
        <span
          className="fr-badge fr-badge--no-icon text-(--text-default-grey)"
          style={{ backgroundColor: alea.bgColor }}>
          {alea.label}
        </span>
      )}
    </div>
  );
}
