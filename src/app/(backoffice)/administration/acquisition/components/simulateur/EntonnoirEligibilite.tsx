"use client";

import { DashboardStatCard } from "../../../tableau-de-bord/shared/DashboardStatCard";
import type { TableauDeBordStats } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

interface EntonnoirEligibiliteProps {
  stats: TableauDeBordStats | null;
  loading: boolean;
}

/**
 * Entonnoir d'eligibilite : visualisation des etapes de conversion
 * simulateur → eligibilite → compte cree → taux de transformation
 */
export default function EntonnoirEligibilite({ stats, loading }: EntonnoirEligibiliteProps) {
  return (
    <div>
      <h2 className="fr-h4 fr-mb-3w">Entonnoir d'eligibilite</h2>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          flexWrap: "wrap",
        }}>
        {/* Etape 1 : Simulations terminees (Matomo) */}
        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
          <DashboardStatCard
            className=""
            value={stats?.simulationsMatomo.valeur.toLocaleString("fr-FR") ?? "..."}
            label="Simulations terminees"
            variation={stats?.simulationsMatomo.variation ?? null}
            loading={loading}
            compact
          />
        </div>

        {/* Fleche */}
        <FunnelArrow />

        {/* Etape 2 : Eligibles + Non eligibles empilees (BDD) */}
        <div
          style={{
            flex: "1 1 180px",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}>
          <DashboardStatCard
            className=""
            value={stats?.simulationsEligibles.valeur.toLocaleString("fr-FR") ?? "..."}
            label="Simulations eligibles"
            variation={stats?.simulationsEligibles.variation ?? null}
            loading={loading}
            compact
          />
          <DashboardStatCard
            className=""
            value={stats?.simulationsNonEligibles.valeur.toLocaleString("fr-FR") ?? "..."}
            label="Simulations non eligibles"
            variation={stats?.simulationsNonEligibles.variation ?? null}
            loading={loading}
            compact
          />
        </div>

        {/* Fleche */}
        <FunnelArrow />

        {/* Etape 3 : Sans inscription FC */}
        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
          <DashboardStatCard
            className=""
            value={stats?.simulationsSansInscription.valeur.toLocaleString("fr-FR") ?? "..."}
            label="Sans inscription FC"
            variation={stats?.simulationsSansInscription.variation ?? null}
            loading={loading}
            compact
          />
        </div>

        {/* Fleche */}
        <FunnelArrow />

        {/* Etape 4 : Comptes crees */}
        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
          <DashboardStatCard
            className=""
            value={stats?.comptesCrees.valeur.toLocaleString("fr-FR") ?? "..."}
            label="Comptes crees"
            variation={stats?.comptesCrees.variation ?? null}
            variationType="points"
            loading={loading}
            compact
          />
        </div>

        {/* Fleche */}
        <FunnelArrow />

        {/* Etape 5 : Taux de transformation */}
        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
          <DashboardStatCard
            className=""
            value={stats ? `${stats.tauxTransformation.valeur.toLocaleString("fr-FR")}%` : "..."}
            label="Transfo. simu. &rarr; comptes"
            variation={stats?.tauxTransformation.variation ?? null}
            variationType="points"
            loading={loading}
            compact
          />
        </div>
      </div>
    </div>
  );
}

/** Fleche de liaison entre les etapes de l'entonnoir */
function FunnelArrow() {
  return (
    <span
      aria-hidden="true"
      style={{
        fontSize: "1.5rem",
        color: "var(--border-default-grey)",
        flexShrink: 0,
        lineHeight: 1,
      }}>
      &rarr;
    </span>
  );
}
