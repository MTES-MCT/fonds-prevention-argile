"use client";

import { useEffect, useState, useCallback } from "react";
import { DemandesArchiveesFullTable } from "./DemandesArchiveesFullTable";
import { DemandesIneligiblesFullTable } from "./DemandesIneligiblesFullTable";
import { getTableauDeBordStatsAction } from "@/features/backoffice/administration/tableau-de-bord/actions/tableau-de-bord.actions";
import type {
  PeriodeId,
  DemandesArchiveesStats,
  DemandesIneligiblesStats,
} from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

interface ArchivageIneligibiliteTabProps {
  periodeId: PeriodeId;
  codeDepartement: string;
}

export function ArchivageIneligibiliteTab({ periodeId, codeDepartement }: ArchivageIneligibiliteTabProps) {
  const [archiveesStats, setArchiveesStats] = useState<DemandesArchiveesStats | null>(null);
  const [ineligiblesStats, setIneligiblesStats] = useState<DemandesIneligiblesStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    setLoading(true);
    const result = await getTableauDeBordStatsAction(periodeId, codeDepartement || undefined);
    if (result.success) {
      setArchiveesStats(result.data.demandesArchiveesDetail);
      setIneligiblesStats(result.data.demandesIneligiblesDetail);
    }
    setLoading(false);
  }, [periodeId, codeDepartement]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div className="fr-py-4w" style={{ textAlign: "center", color: "var(--text-mention-grey)" }}>
        Chargement des statistiques...
      </div>
    );
  }

  return (
    <div className="fr-grid-row fr-grid-row--gutters" style={{ maxWidth: "800px" }}>
      <div className="fr-col-12">{archiveesStats && <DemandesArchiveesFullTable stats={archiveesStats} />}</div>
      <div className="fr-col-12">{ineligiblesStats && <DemandesIneligiblesFullTable stats={ineligiblesStats} />}</div>
    </div>
  );
}
