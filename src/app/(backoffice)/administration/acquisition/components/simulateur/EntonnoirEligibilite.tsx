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
            label="Visites avec un résultat"
            variation={simulationsTerminees?.variation ?? null}
            loading={false}
            compact
            tooltip="Données Matomo, anonymes comprises : visites ayant affiché un résultat, éligible ou non. Une visite qui obtient les deux compte deux fois ; plusieurs résultats du même type comptent une fois. Le total du tableau par département peut être plus élevé : il compte une ligne par département et par page. Même calcul que la page publique."
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
            label="Visites avec un résultat éligible"
            variation={eligibles?.variation ?? null}
            loading={false}
            compact
            tooltip="Données Matomo : visites ayant affiché au moins un résultat éligible"
          />
          <DashboardStatCard
            className=""
            value={formatMatomoValue(nonEligibles, matomoLoaded)}
            label="Visites avec un résultat non éligible"
            variation={nonEligibles?.variation ?? null}
            loading={false}
            compact
            tooltip="Données Matomo : visites ayant affiché au moins un résultat non éligible"
          />
        </div>

        {/* Fleche */}
        <FunnelArrow />

        {/* Etape 3 : Comptes crees */}
        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
          <DashboardStatCard
            className=""
            value={stats?.comptesCrees.valeur.toLocaleString("fr-FR") ?? "..."}
            label="Comptes créés"
            variation={stats?.comptesCrees.variation ?? null}
            loading={loading}
            compact
            tooltip="Parcours créés sur la période. Avec un filtre département, seulement ceux qui ont une simulation. La page publique compte tous les parcours depuis le lancement."
          />
        </div>

        {/* Fleche */}
        <FunnelArrow />

        {/* Etape 4 : Taux de transformation */}
        <div style={{ flex: "1 1 180px", minWidth: 0 }}>
          <DashboardStatCard
            className=""
            value={formatMatomoValue(taux, matomoLoaded, "%")}
            label="Transfo. visites &rarr; comptes"
            variation={taux?.variation ?? null}
            variationType="points"
            loading={false}
            compact
            tooltip="Calculé : comptes créés / visites avec un résultat (Matomo)"
          />
        </div>
      </div>
      <p className="fr-text--xs fr-mt-1w" style={{ color: "var(--text-mention-grey)", marginBottom: 0 }}>
        Visites : données Matomo (tous utilisateurs) | Comptes : données de l&apos;application
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
