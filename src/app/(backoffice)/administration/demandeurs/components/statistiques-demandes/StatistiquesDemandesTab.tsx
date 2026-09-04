"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { NombreDemandesParEtape } from "./NombreDemandesParEtape";
import { DelaisMoyensParEtape } from "./DelaisMoyensParEtape";
import { RepartitionAmoCards } from "./RepartitionAmoCards";
import { RepartitionDossiersCards } from "./RepartitionDossiersCards";
import { SourcesAcquisitionTable } from "./SourcesAcquisitionTable";
import { EvolutionDemandeurs } from "@/shared/components/EvolutionDemandeurs";
import { filterUsersByDepartement } from "../filters/departements/departementFilter.utils";
import { filterUsersByPeriode } from "../filters/periode/periodeFilter.utils";
import { excludeArchivedUsers, keepOnlyArchivedUsers } from "../filters/archivage/archivageFilter.utils";
import { getTableauDeBordStatsAction } from "@/features/backoffice/administration/tableau-de-bord/actions/tableau-de-bord.actions";
import { aggregerEvolution } from "@/shared/utils/evolution-temporelle";
import type { UserWithParcoursDetails } from "@/features/backoffice";
import type {
  PeriodeId,
  TableauDeBordStats,
} from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

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
    let filtered = filterUsersByPeriode(users, periodeId);

    // Filtre par departement
    if (codeDepartement) {
      filtered = filterUsersByDepartement(filtered, codeDepartement);
    }

    return filtered;
  }, [users, periodeId, codeDepartement]);

  // Un dossier archivé n'avance plus mais reste sur son dernier `currentStep` : il fausserait
  // les compteurs "par étape" (nombre de demandes, délais, répartitions) s'il y restait mêlé.
  const activeUsers = useMemo(() => excludeArchivedUsers(filteredUsers), [filteredUsers]);
  const archivedOnlyUsers = useMemo(() => keepOnlyArchivedUsers(filteredUsers), [filteredUsers]);

  const evolution = useMemo(() => {
    const dates = filteredUsers
      .map((u) => u.parcours?.createdAt ?? u.user.createdAt)
      .filter((d): d is Date => d instanceof Date);
    return aggregerEvolution(dates);
  }, [filteredUsers]);

  return (
    <div>
      <h2 className="fr-h4 fr-mb-4w">Données des {filteredUsers.length.toLocaleString("fr-FR")} demandeurs</h2>

      {/* Graphe d'evolution */}
      <EvolutionDemandeurs evolution={evolution} />

      {/* Nombre de demandes par etape + Delais moyens (dossiers archives exclus) */}
      <div className="fr-grid-row fr-grid-row--gutters fr-mb-4w">
        <div className="fr-col-12 fr-col-lg-6">
          <NombreDemandesParEtape users={activeUsers} />
        </div>
        <div className="fr-col-12 fr-col-lg-6">
          <DelaisMoyensParEtape users={activeUsers} />
        </div>
      </div>

      {/* Nombre de demandes archivees par etape : symetrique du graphe ci-dessus */}
      <div className="fr-mb-4w">
        <NombreDemandesParEtape
          users={archivedOnlyUsers}
          titre="Nombre de demandes archivées par étape"
          tooltip="Données base de données — dossiers archivés uniquement (dernière étape atteinte avant l'archivage)"
        />
      </div>

      {/* Repartitions AMO — dossiers archives exclus seulement du compteur "en attente"
          (les autres restent des faits historiques, cf. RepartitionAmoCards) */}
      <div className="fr-mb-4w">
        <RepartitionAmoCards users={filteredUsers} stats={stats} loading={loading} />
      </div>

      {/* Repartition dossiers DN — idem, seul "en cours de creation" exclut les archives */}
      <div className="fr-mb-4w">
        <RepartitionDossiersCards users={filteredUsers} stats={stats} loading={loading} />
      </div>

      {/* Sources d'acquisition */}
      <div className="fr-mb-4w">
        <SourcesAcquisitionTable
          filteredUsers={filteredUsers}
          allUsers={users}
          periodeId={periodeId}
          codeDepartement={codeDepartement}
        />
      </div>
    </div>
  );
}
