"use client";

import { DashboardStatCard } from "../../../tableau-de-bord/shared/DashboardStatCard";
import type { TableauDeBordStats, MatomoSimulationsStats } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

interface EntonnoirEligibiliteProps {
  stats: TableauDeBordStats | null;
  /** Stats Matomo chargees en asynchrone — surcharge les valeurs BDD quand disponibles */
  matomoSimuStats: MatomoSimulationsStats | null;
  loading: boolean;
}

/**
 * Entonnoir d'eligibilite : visualisation des etapes de conversion
 * simulateur → eligibilite → sans inscription → compte cree → taux de transformation
 *
 * Les stats BDD s'affichent immediatement, puis les valeurs Matomo les remplacent quand elles arrivent.
 */
export default function EntonnoirEligibilite({ stats, matomoSimuStats, loading }: EntonnoirEligibiliteProps) {
  // Utiliser Matomo si disponible, sinon BDD
  const simulationsTerminees = matomoSimuStats?.simulationsMatomo ?? stats?.simulationsLancees ?? null;
  const eligibles = matomoSimuStats?.simulationsEligibles ?? stats?.simulationsEligibles ?? null;
  const nonEligibles = matomoSimuStats?.simulationsNonEligibles ?? stats?.simulationsNonEligibles ?? null;
  const sansInscription = matomoSimuStats?.simulationsSansInscription ?? stats?.simulationsSansInscription ?? null;
  const taux = matomoSimuStats?.tauxTransformation ?? stats?.tauxTransformation ?? null;

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
        {/* Etape 1 : Simulations terminees */}
        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
          <DashboardStatCard
            className=""
            value={simulationsTerminees?.valeur.toLocaleString("fr-FR") ?? "..."}
            label="Simulations terminees"
            variation={simulationsTerminees?.variation ?? null}
            loading={loading}
            compact
          />
        </div>

        {/* Fleche */}
        <FunnelArrow />

        {/* Etape 2 : Eligibles + Non eligibles empilees */}
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
            value={eligibles?.valeur.toLocaleString("fr-FR") ?? "..."}
            label="Simulations eligibles"
            variation={eligibles?.variation ?? null}
            loading={loading}
            compact
          />
          <DashboardStatCard
            className=""
            value={nonEligibles?.valeur.toLocaleString("fr-FR") ?? "..."}
            label="Simulations non eligibles"
            variation={nonEligibles?.variation ?? null}
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
            value={sansInscription?.valeur.toLocaleString("fr-FR") ?? "..."}
            label="Sans inscription FC"
            variation={sansInscription?.variation ?? null}
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
            value={taux ? `${taux.valeur.toLocaleString("fr-FR")}%` : "..."}
            label="Transfo. simu. &rarr; comptes"
            variation={taux?.variation ?? null}
            variationType="points"
            loading={loading}
            compact
          />
        </div>
      </div>
      <p className="fr-text--xs fr-mt-1w" style={{ color: "var(--text-mention-grey)", marginBottom: 0 }}>
        Simulations : donnees Matomo (tous utilisateurs) | Comptes : donnees application
      </p>
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
