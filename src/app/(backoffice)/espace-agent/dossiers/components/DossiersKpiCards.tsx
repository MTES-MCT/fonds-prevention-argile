"use client";

import { DashboardStatCard } from "../../../administration/tableau-de-bord/shared/DashboardStatCard";
import { RESPONSABLE_KPI_LABELS } from "@/features/backoffice/espace-agent/dossiers/domain";
import type { ResponsableTabId } from "@/features/backoffice/espace-agent/dossiers/domain";

interface DossiersKpiCardsProps {
  counters: Record<ResponsableTabId, number>;
}

const KPI_IDS: Array<keyof typeof RESPONSABLE_KPI_LABELS> = ["AV", "AMO", "MENAGE", "DDT"];

/**
 * Bandeau de 4 cartes KPI au-dessus du listing, dérivées des mêmes compteurs
 * que les tags responsable. Réutilise `DashboardStatCard` du tableau de bord.
 */
export function DossiersKpiCards({ counters }: DossiersKpiCardsProps) {
  return (
    <div className="fr-grid-row fr-grid-row--gutters">
      {KPI_IDS.map((id) => (
        <DashboardStatCard
          key={id}
          value={counters[id].toLocaleString("fr-FR")}
          label={RESPONSABLE_KPI_LABELS[id]}
          variation={null}
          compact
        />
      ))}
    </div>
  );
}
