"use client";

import { useMemo } from "react";
import { DashboardStatCard } from "@/app/(backoffice)/administration/tableau-de-bord/shared/DashboardStatCard";
import { DSStatus } from "@/shared/domain/value-objects";
import type { UserWithParcoursDetails } from "@/features/backoffice";
import type { TableauDeBordStats } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

interface RepartitionDossiersCardsProps {
  users: UserWithParcoursDetails[];
  stats: TableauDeBordStats | null;
  loading?: boolean;
}

export function RepartitionDossiersCards({ users, stats, loading = false }: RepartitionDossiersCardsProps) {
  const counts = useMemo(() => {
    let brouillons = 0;
    let deposes = 0;
    let enConstruction = 0;
    let enInstruction = 0;

    for (const u of users) {
      const allDossiers = [u.dossiers.eligibilite, u.dossiers.diagnostic, u.dossiers.devis, u.dossiers.factures];
      for (const d of allDossiers) {
        if (!d) continue;
        switch (d.dsStatus) {
          case DSStatus.EN_CONSTRUCTION:
            brouillons++;
            enConstruction++;
            break;
          case DSStatus.EN_INSTRUCTION:
            deposes++;
            enInstruction++;
            break;
          case DSStatus.ACCEPTE:
          case DSStatus.REFUSE:
          case DSStatus.CLASSE_SANS_SUITE:
            deposes++;
            break;
        }
      }
    }

    return { brouillons, deposes, enConstruction, enInstruction };
  }, [users]);

  return (
    <div>
      <h3 className="fr-h6 fr-mb-1v">Répartition dossiers</h3>
      <p className="fr-text--sm fr-text-mention--grey fr-mb-2w">Dans Démarche Numérique</p>
      <div className="fr-grid-row fr-grid-row--gutters">
        <DashboardStatCard
          value={counts.brouillons.toLocaleString("fr-FR")}
          label="Brouillons créés"
          variation={null}
          loading={loading}
          compact
        />
        <DashboardStatCard
          value={counts.deposes.toLocaleString("fr-FR")}
          label="Dossiers déposés"
          variation={stats?.dossiersDemarcheNumerique.variation ?? null}
          loading={loading}
          compact
        />
        <DashboardStatCard
          value={counts.enConstruction.toLocaleString("fr-FR")}
          label="En construction"
          variation={null}
          loading={loading}
          compact
        />
        <DashboardStatCard
          value={counts.enInstruction.toLocaleString("fr-FR")}
          label="En instruction DDT"
          variation={null}
          loading={loading}
          compact
        />
      </div>
    </div>
  );
}
