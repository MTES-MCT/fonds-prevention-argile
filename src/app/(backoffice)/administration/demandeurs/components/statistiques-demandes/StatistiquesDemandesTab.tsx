"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { NombreDemandesParEtape } from "./NombreDemandesParEtape";
import { DelaisMoyensParEtape } from "./DelaisMoyensParEtape";
import { RepartitionAmoCards } from "./RepartitionAmoCards";
import { RepartitionDossiersCards } from "./RepartitionDossiersCards";
import { EvolutionDemandeurs } from "@/app/(backoffice)/espace-agent/statistiques/components/EvolutionDemandeurs";
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
import type { EvolutionDemandeurs as EvolutionDemandeursType } from "@/features/backoffice/espace-agent/statistiques/domain/types";

/** Calcule la date de debut pour une periode donnee */
function getDateDebut(periodeId: PeriodeId): Date {
  const periode = PERIODES.find((p) => p.id === periodeId);
  if (!periode || periode.jours === null) {
    return SERVICE_START_DATE;
  }
  const now = new Date();
  return new Date(now.getTime() - periode.jours * 24 * 60 * 60 * 1000);
}

function debutDeSemaine(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const jour = d.getDay();
  const diff = jour === 0 ? -6 : 1 - jour;
  d.setDate(d.getDate() + diff);
  return d;
}

function computeEvolution(users: UserWithParcoursDetails[]): EvolutionDemandeursType {
  const dates = users
    .map((u) => u.parcours?.createdAt ?? u.user.createdAt)
    .filter((d): d is Date => d instanceof Date);

  if (dates.length === 0) {
    return { points: [], granularite: "jour" };
  }

  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
  const diffJours = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
  const granularite: "jour" | "semaine" = diffJours <= 30 ? "jour" : "semaine";

  if (granularite === "jour") {
    const compteParJour = new Map<string, number>();
    const cursor = new Date(minDate);
    cursor.setHours(0, 0, 0, 0);
    const fin = new Date(maxDate);
    fin.setHours(0, 0, 0, 0);
    while (cursor <= fin) {
      compteParJour.set(cursor.toISOString().slice(0, 10), 0);
      cursor.setDate(cursor.getDate() + 1);
    }
    for (const date of dates) {
      const cle = date.toISOString().slice(0, 10);
      compteParJour.set(cle, (compteParJour.get(cle) ?? 0) + 1);
    }
    return {
      granularite,
      points: Array.from(compteParJour.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([cle, count]) => ({
          label: new Date(cle).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
          count,
        })),
    };
  } else {
    const compteParSemaine = new Map<string, number>();
    const debutMin = debutDeSemaine(minDate);
    const debutMax = debutDeSemaine(maxDate);
    const cursor = new Date(debutMin);
    while (cursor <= debutMax) {
      compteParSemaine.set(cursor.toISOString().slice(0, 10), 0);
      cursor.setDate(cursor.getDate() + 7);
    }
    for (const date of dates) {
      const cle = debutDeSemaine(date).toISOString().slice(0, 10);
      compteParSemaine.set(cle, (compteParSemaine.get(cle) ?? 0) + 1);
    }
    return {
      granularite,
      points: Array.from(compteParSemaine.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([cle, count]) => ({
          label: new Date(cle).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
          count,
        })),
    };
  }
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

  const evolution = useMemo(() => computeEvolution(filteredUsers), [filteredUsers]);

  return (
    <div>
      <h2 className="fr-h4 fr-mb-4w">Données des {filteredUsers.length.toLocaleString("fr-FR")} demandeurs</h2>

      {/* Graphe d'evolution */}
      <EvolutionDemandeurs evolution={evolution} />

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
