"use client";

import { DashboardStatCard } from "../../../tableau-de-bord/shared/DashboardStatCard";
import { formatMatomoValue } from "../../../tableau-de-bord/shared/format-matomo-value.utils";
import type {
  TableauDeBordStats,
  MatomoSimulationsStats,
} from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

interface EntonnoirEligibiliteProps {
  stats: TableauDeBordStats | null;
  /** Stats Matomo chargees en asynchrone — surcharge les valeurs BDD quand disponibles */
  matomoSimuStats: MatomoSimulationsStats | null;
  /** true quand l'appel Matomo est termine (succes ou echec) */
  matomoLoaded: boolean;
  loading: boolean;
  /** true si un filtre partenaire est actif (les comptes BDD ne sont alors pas filtrables) */
  partnerFilterActive?: boolean;
}

/**
 * Entonnoir d'eligibilite : visualisation des etapes de conversion
 * simulateur → eligibilite → compte cree → taux de transformation
 *
 * Les stats Matomo sont la source unique pour les simulations (pas de fallback BDD).
 */
export default function EntonnoirEligibilite({
  stats,
  matomoSimuStats,
  matomoLoaded,
  loading,
  partnerFilterActive = false,
}: EntonnoirEligibiliteProps) {
  // Matomo uniquement pour les simulations (pas de fallback BDD)
  const simulationsTerminees = matomoSimuStats?.simulationsMatomo ?? null;
  const eligibles = matomoSimuStats?.simulationsEligibles ?? null;
  const nonEligibles = matomoSimuStats?.simulationsNonEligibles ?? null;
  const taux = matomoSimuStats?.tauxTransformation ?? null;

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
            value={formatMatomoValue(simulationsTerminees, matomoLoaded)}
            label="Simulations terminees"
            variation={simulationsTerminees?.variation ?? null}
            loading={false}
            compact
            tooltip="Données Matomo"
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
            value={formatMatomoValue(eligibles, matomoLoaded)}
            label="Simulations eligibles"
            variation={eligibles?.variation ?? null}
            loading={false}
            compact
            tooltip="Données Matomo"
          />
          <DashboardStatCard
            className=""
            value={formatMatomoValue(nonEligibles, matomoLoaded)}
            label="Simulations non eligibles"
            variation={nonEligibles?.variation ?? null}
            loading={false}
            compact
            tooltip="Données Matomo"
          />
        </div>

        {/* Fleche */}
        <FunnelArrow />

        {/* Etape 3 : Comptes crees */}
        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
          <DashboardStatCard
            className=""
            value={
              partnerFilterActive
                ? "—"
                : (stats?.comptesCrees.valeur.toLocaleString("fr-FR") ?? "...")
            }
            label="Comptes crees"
            variation={partnerFilterActive ? null : (stats?.comptesCrees.variation ?? null)}
            variationType="points"
            loading={partnerFilterActive ? false : loading}
            compact
            tooltip={
              partnerFilterActive
                ? "Non disponible avec un filtre partenaire (les comptes ne portent pas encore d'origine partenaire — voir Phase B)"
                : "Données base de données"
            }
          />
        </div>

        {/* Fleche */}
        <FunnelArrow />

        {/* Etape 4 : Taux de transformation */}
        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
          <DashboardStatCard
            className=""
            value={partnerFilterActive ? "—" : formatMatomoValue(taux, matomoLoaded, "%")}
            label="Transfo. simu. &rarr; comptes"
            variation={partnerFilterActive ? null : (taux?.variation ?? null)}
            variationType="points"
            loading={false}
            compact
            tooltip={
              partnerFilterActive
                ? "Non disponible avec un filtre partenaire (dépend des comptes BDD non filtrables — voir Phase B)"
                : "Calculé : comptes créés / simulations terminées (Matomo)"
            }
          />
        </div>
      </div>
      <p className="fr-text--xs fr-mt-1w" style={{ color: "var(--text-mention-grey)", marginBottom: 0 }}>
        Simulations : donnees Matomo (tous utilisateurs) | Comptes : donnees application
        {partnerFilterActive && (
          <>
            <br />
            <strong>Filtre partenaire actif :</strong> seules les données Matomo sont segmentées. Les comptes créés et le
            taux de transformation ne sont pas filtrables tant que l'origine partenaire n'est pas stockée en base (Phase B).
          </>
        )}
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
