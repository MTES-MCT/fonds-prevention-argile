"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { MicroFissuresSection } from "./MicroFissuresSection";
import { IndemnisationSection } from "./IndemnisationSection";
import { TranchesRevenusSection } from "./TranchesRevenusSection";
import { TopDepartementsTable } from "./TopDepartementsTable";
import { TopCommunesTable } from "./TopCommunesTable";
import { filterUsersByDepartement } from "../filters/departements/departementFilter.utils";
import { getEligibiliteStatsAction } from "@/features/backoffice/administration/tableau-de-bord/actions/tableau-de-bord.actions";
import type { UserWithParcoursDetails } from "@/features/backoffice";
import type { PeriodeId } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import {
  PERIODES,
  SERVICE_START_DATE,
} from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type { EligibiliteStats } from "@/features/backoffice/administration/tableau-de-bord/domain/types/eligibilite-stats.types";

/** Calcule la date de debut pour une periode donnee */
function getDateDebut(periodeId: PeriodeId): Date {
  const periode = PERIODES.find((p) => p.id === periodeId);
  if (!periode || periode.jours === null) {
    return SERVICE_START_DATE;
  }
  const now = new Date();
  return new Date(now.getTime() - periode.jours * 24 * 60 * 60 * 1000);
}

interface DonneesEligibiliteTabProps {
  users: UserWithParcoursDetails[];
  periodeId: PeriodeId;
  codeDepartement: string;
}

export function DonneesEligibiliteTab({ users, periodeId, codeDepartement }: DonneesEligibiliteTabProps) {
  const [stats, setStats] = useState<EligibiliteStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    const result = await getEligibiliteStatsAction(periodeId, codeDepartement || undefined);
    if (result.success) {
      setStats(result.data);
    }
    setLoading(false);
  }, [periodeId, codeDepartement]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Filtrer les users par periode + departement (pour le titre)
  const filteredUsers = useMemo(() => {
    let filtered = users;

    const dateDebut = getDateDebut(periodeId);
    filtered = filtered.filter((u) => {
      const createdAt = u.parcours?.createdAt ?? u.user.createdAt;
      return createdAt >= dateDebut;
    });

    if (codeDepartement) {
      filtered = filterUsersByDepartement(filtered, codeDepartement);
    }

    return filtered;
  }, [users, periodeId, codeDepartement]);

  return (
    <div>
      <h2 className="fr-h4 fr-mb-4w">Données des {filteredUsers.length.toLocaleString("fr-FR")} demandeurs</h2>

      <MicroFissuresSection stats={stats} loading={loading} />
      <IndemnisationSection stats={stats} loading={loading} />
      <TranchesRevenusSection stats={stats} loading={loading} />

      {/* Top 5 départements et communes côte à côte */}
      <div className="fr-grid-row fr-grid-row--gutters">
        <div className="fr-col-12 fr-col-lg-6">
          <TopDepartementsTable stats={stats} loading={loading} />
        </div>
        <div className="fr-col-12 fr-col-lg-6">
          <TopCommunesTable stats={stats} loading={loading} />
        </div>
      </div>
    </div>
  );
}
