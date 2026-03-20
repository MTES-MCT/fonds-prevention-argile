"use client";

import { useMemo } from "react";
import { DashboardStatCard } from "@/app/(backoffice)/administration/tableau-de-bord/shared/DashboardStatCard";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import type { UserWithParcoursDetails } from "@/features/backoffice";
import type { TableauDeBordStats } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

interface RepartitionAmoCardsProps {
  users: UserWithParcoursDetails[];
  stats: TableauDeBordStats | null;
  loading?: boolean;
}

export function RepartitionAmoCards({ users, stats, loading = false }: RepartitionAmoCardsProps) {
  const counts = useMemo(() => {
    const envoyees = users.filter((u) => u.amoValidation !== null).length;
    const validees = users.filter((u) => u.amoValidation?.statut === StatutValidationAmo.LOGEMENT_ELIGIBLE).length;
    const enAttente = users.filter((u) => u.amoValidation?.statut === StatutValidationAmo.EN_ATTENTE).length;
    const refusees = users.filter(
      (u) =>
        u.amoValidation?.statut === StatutValidationAmo.LOGEMENT_NON_ELIGIBLE ||
        u.amoValidation?.statut === StatutValidationAmo.ACCOMPAGNEMENT_REFUSE
    ).length;
    return { envoyees, validees, enAttente, refusees };
  }, [users]);

  return (
    <div>
      <h3 className="fr-h6 fr-mb-2w">Répartitions demandes d'AMO</h3>
      <div className="fr-grid-row fr-grid-row--gutters">
        <DashboardStatCard
          value={counts.envoyees.toLocaleString("fr-FR")}
          label="Demandes d'AMO envoyées"
          variation={stats?.demandesAmoEnvoyees.variation ?? null}
          loading={loading}
          compact
        />
        <DashboardStatCard
          value={counts.validees.toLocaleString("fr-FR")}
          label="Demandes d'AMO validées"
          variation={null}
          loading={loading}
          compact
        />
        <DashboardStatCard
          value={counts.enAttente.toLocaleString("fr-FR")}
          label="Demandes d'AMO en attente"
          variation={stats?.reponsesAmoEnAttente.variation ?? null}
          loading={loading}
          compact
        />
        <DashboardStatCard
          value={counts.refusees.toLocaleString("fr-FR")}
          label="Demandes d'AMO refusées"
          variation={null}
          loading={loading}
          compact
        />
      </div>
    </div>
  );
}
