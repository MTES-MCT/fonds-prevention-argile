"use client";

import { DashboardStatCard } from "@/app/(backoffice)/administration/tableau-de-bord/shared/DashboardStatCard";
import type { EligibiliteStats } from "@/features/backoffice/administration/tableau-de-bord/domain/types/eligibilite-stats.types";
import {
  LIBELLES_PERIODE_CONSTRUCTION,
  PERIODES_CONSTRUCTION,
} from "@/features/backoffice/administration/tableau-de-bord/domain/periode-construction";

interface PeriodeConstructionSectionProps {
  stats: EligibiliteStats | null;
  loading: boolean;
}

export function PeriodeConstructionSection({ stats, loading }: PeriodeConstructionSectionProps) {
  const total = PERIODES_CONSTRUCTION.reduce((somme, p) => somme + (stats?.periodesConstruction[p].valeur ?? 0), 0);

  return (
    <div className="fr-mb-4w">
      <h3 className="fr-h6 fr-mb-1v">Période de construction de la maison</h3>
      <p className="fr-text--sm fr-text-mention--grey fr-mb-2w">Sur les simulations éligibles</p>
      <div className="fr-grid-row fr-grid-row--gutters">
        {PERIODES_CONSTRUCTION.map((periode) => {
          const valeur = stats?.periodesConstruction[periode].valeur ?? 0;
          const pourcentage = total > 0 ? `${Math.round((valeur / total) * 100)} %` : "—";
          return (
            <DashboardStatCard
              key={periode}
              value={valeur.toLocaleString("fr-FR")}
              label={`${LIBELLES_PERIODE_CONSTRUCTION[periode]} · ${pourcentage}`}
              variation={stats?.periodesConstruction[periode].variation ?? null}
              loading={loading}
              compact
              className="fr-col-12 fr-col-md-6 fr-col-lg-3"
            />
          );
        })}
      </div>
    </div>
  );
}
