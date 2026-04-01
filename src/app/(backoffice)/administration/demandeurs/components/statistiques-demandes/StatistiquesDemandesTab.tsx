"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { NombreDemandesParEtape } from "./NombreDemandesParEtape";
import { DelaisMoyensParEtape } from "./DelaisMoyensParEtape";
import { RepartitionAmoCards } from "./RepartitionAmoCards";
import { RepartitionDossiersCards } from "./RepartitionDossiersCards";
import { filterUsersByDepartement } from "../filters/departements/departementFilter.utils";
import { getTableauDeBordStatsAction } from "@/features/backoffice/administration/tableau-de-bord/actions/tableau-de-bord.actions";
import type { UserWithParcoursDetails } from "@/features/backoffice";
import type {
  PeriodeId,
  TableauDeBordStats,
} from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import {
  PERIODES,
  SERVICE_START_DATE,
} from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

/** Calcule la date de debut pour une periode donnee */
function getDateDebut(periodeId: PeriodeId): Date {
  const periode = PERIODES.find((p) => p.id === periodeId);
  if (!periode || periode.jours === null) {
    return SERVICE_START_DATE;
  }
  const now = new Date();
  return new Date(now.getTime() - periode.jours * 24 * 60 * 60 * 1000);
}

interface StatistiquesDemandesTabProps {
  users: UserWithParcoursDetails[];
  periodeId: PeriodeId;
  codeDepartement: string;
}

export function StatistiquesDemandesTab({ users, periodeId, codeDepartement }: StatistiquesDemandesTabProps) {
  const [stats, setStats] = useState<TableauDeBordStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    const result = await getTableauDeBordStatsAction(periodeId, codeDepartement || undefined);
    if (result.success) {
      setStats(result.data);
    }
    setLoading(false);
  }, [periodeId, codeDepartement]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Filtrer les users par periode + departement
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Filtre par periode (base sur createdAt du parcours)
    const dateDebut = getDateDebut(periodeId);
    filtered = filtered.filter((u) => {
      const createdAt = u.parcours?.createdAt ?? u.user.createdAt;
      return createdAt >= dateDebut;
    });

    // Filtre par departement
    if (codeDepartement) {
      filtered = filterUsersByDepartement(filtered, codeDepartement);
    }

    return filtered;
  }, [users, periodeId, codeDepartement]);

  return (
    <div>
      <h2 className="fr-h4 fr-mb-4w">Données des {filteredUsers.length.toLocaleString("fr-FR")} demandeurs</h2>

      {/* Nombre de demandes par etape + Delais moyens */}
      <div className="fr-grid-row fr-grid-row--gutters fr-mb-4w">
        <div className="fr-col-12 fr-col-lg-6">
          <NombreDemandesParEtape users={filteredUsers} />
        </div>
        <div className="fr-col-12 fr-col-lg-6">
          <DelaisMoyensParEtape users={filteredUsers} />
        </div>
      </div>

      {/* Repartitions AMO */}
      <div className="fr-mb-4w">
        <RepartitionAmoCards users={filteredUsers} stats={stats} loading={loading} />
      </div>

      {/* Repartition dossiers DN */}
      <div className="fr-mb-4w">
        <RepartitionDossiersCards users={filteredUsers} stats={stats} loading={loading} />
      </div>
    </div>
  );
}
