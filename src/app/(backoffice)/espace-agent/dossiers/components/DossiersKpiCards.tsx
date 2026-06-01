"use client";

import { DashboardStatCard } from "../../../administration/tableau-de-bord/shared/DashboardStatCard";
import { RESPONSABLE_KPI_LABELS } from "@/features/backoffice/espace-agent/dossiers/domain";

/**
 * Compteurs des 4 KPI affichés en haut du listing dossiers.
 * Chaque entrée correspond à un état distinct (cf. DossierEtat) :
 *  - AV : pré-éligibilité à vérifier (etat = AV_QUALIFICATION)
 *  - AMO : demande AMO en attente (etat = EN_ATTENTE_AMO)
 *  - MENAGE : actions ménages attendues (etat = MENAGE)
 *  - DDT : instructions DDT en cours (etat = DDT)
 */
export type DossiersKpiCounters = Record<"AV" | "AMO" | "MENAGE" | "DDT", number>;

interface DossiersKpiCardsProps {
  counters: DossiersKpiCounters;
}

const KPI_IDS: Array<keyof DossiersKpiCounters> = ["AV", "AMO", "MENAGE", "DDT"];

/**
 * Bandeau de 4 cartes KPI au-dessus du listing. Réutilise `DashboardStatCard`
 * du tableau de bord.
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
