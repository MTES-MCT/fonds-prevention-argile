"use client";

import { DashboardStatCard } from "@/app/(backoffice)/administration/tableau-de-bord/shared/DashboardStatCard";
import type { EligibiliteStats } from "@/features/backoffice/administration/tableau-de-bord/domain/types/eligibilite-stats.types";

interface MicroFissuresSectionProps {
  stats: EligibiliteStats | null;
  loading: boolean;
}

export function MicroFissuresSection({ stats, loading }: MicroFissuresSectionProps) {
  return (
    <div className="fr-mb-4w">
      <h3 className="fr-h6 fr-mb-1v">Micro-fissures</h3>
      <p className="fr-text--sm fr-text-mention--grey fr-mb-2w">Sur les simulations éligibles</p>
      <div className="fr-grid-row fr-grid-row--gutters">
        <DashboardStatCard
          value={(stats?.avecMicroFissures.valeur ?? 0).toLocaleString("fr-FR")}
          label="Avec micro-fissures"
          variation={stats?.avecMicroFissures.variation ?? null}
          loading={loading}
          compact
          className="fr-col-12 fr-col-md-6 fr-col-lg-3"
        />
        <DashboardStatCard
          value={(stats?.sansMicroFissures.valeur ?? 0).toLocaleString("fr-FR")}
          label="Sans micro-fissures"
          variation={stats?.sansMicroFissures.variation ?? null}
          loading={loading}
          compact
          className="fr-col-12 fr-col-md-6 fr-col-lg-3"
        />
      </div>
    </div>
  );
}
