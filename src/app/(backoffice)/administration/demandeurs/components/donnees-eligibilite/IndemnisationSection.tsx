"use client";

import { DashboardStatCard } from "@/app/(backoffice)/administration/tableau-de-bord/shared/DashboardStatCard";
import type { EligibiliteStats } from "@/features/backoffice/administration/tableau-de-bord/domain/types/eligibilite-stats.types";

interface IndemnisationSectionProps {
  stats: EligibiliteStats | null;
  loading: boolean;
}

export function IndemnisationSection({ stats, loading }: IndemnisationSectionProps) {
  return (
    <div className="fr-mb-4w">
      <h3 className="fr-h6 fr-mb-1v">Indemnisations antérieure</h3>
      <p className="fr-text--sm fr-text-mention--grey fr-mb-2w">Sur les simulations éligibles</p>
      <div className="fr-grid-row fr-grid-row--gutters">
        <DashboardStatCard
          value={(stats?.dejaIndemnisees.valeur ?? 0).toLocaleString("fr-FR")}
          label="Déjà indemnisées"
          variation={stats?.dejaIndemnisees.variation ?? null}
          loading={loading}
          compact
          className="fr-col-12 fr-col-md-6 fr-col-lg-3"
        />
        <DashboardStatCard
          value={(stats?.nonIndemnisees.valeur ?? 0).toLocaleString("fr-FR")}
          label="Non indemnisées"
          variation={stats?.nonIndemnisees.variation ?? null}
          loading={loading}
          compact
          className="fr-col-12 fr-col-md-6 fr-col-lg-3"
        />
      </div>
    </div>
  );
}
