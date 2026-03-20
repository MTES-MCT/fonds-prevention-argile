"use client";

import type { EligibiliteStats } from "@/features/backoffice/administration/tableau-de-bord/domain/types/eligibilite-stats.types";
import type { TrancheRevenuRga } from "@/features/simulateur/domain/types/rga-revenus.types";

interface TranchesRevenusSectionProps {
  stats: EligibiliteStats | null;
  loading: boolean;
}

const TRANCHE_CONFIG: {
  tranche: TrancheRevenuRga;
  label: string;
  badgeClass: string;
}[] = [
  { tranche: "très modeste", label: "TRÈS MODESTE", badgeClass: "fr-badge--info" },
  { tranche: "modeste", label: "MODESTE", badgeClass: "fr-badge--yellow-tournesol" },
  { tranche: "intermédiaire", label: "INTERMÉDIAIRE", badgeClass: "fr-badge--purple-glycine" },
  { tranche: "supérieure", label: "SUPÉRIEURE", badgeClass: "fr-badge--purple-glycine" },
];

function VariationBadge({ variation }: { variation: number | null }) {
  if (variation === null) return null;

  const isPositive = variation > 0;
  const isNegative = variation < 0;

  const arrow = isPositive ? "\u2191" : isNegative ? "\u2193" : "\u2192";
  const sign = isPositive ? "+" : "";
  const text = `${arrow} ${sign}${variation} %`;

  let bgColor = "var(--background-contrast-grey)";
  let textColor = "var(--text-default-grey)";

  if (isPositive) {
    bgColor = "var(--background-contrast-success)";
    textColor = "var(--text-default-success)";
  } else if (isNegative) {
    bgColor = "var(--background-contrast-error)";
    textColor = "var(--text-default-error)";
  }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem 0.5rem",
        borderRadius: "0.25rem",
        fontSize: "0.75rem",
        fontWeight: 700,
        backgroundColor: bgColor,
        color: textColor,
      }}>
      {text}
    </span>
  );
}

export function TranchesRevenusSection({ stats, loading }: TranchesRevenusSectionProps) {
  return (
    <div className="fr-mb-4w">
      <h3 className="fr-h6 fr-mb-1v">Répartition par tranche de revenus</h3>
      <p className="fr-text--sm fr-text-mention--grey fr-mb-2w">Tranches de revenus selon le barème ANAH</p>
      <div className="fr-grid-row fr-grid-row--gutters">
        {TRANCHE_CONFIG.map(({ tranche, label, badgeClass }) => {
          const data = stats?.tranchesRevenus[tranche];
          return (
            <div key={tranche} className="fr-col-12 fr-col-md-6 fr-col-lg-3" style={{ display: "flex" }}>
              <div
                className="fr-p-2w"
                style={{
                  backgroundColor: "var(--background-default-grey)",
                  border: "1px solid var(--border-default-grey)",
                  boxShadow: "inset 0 -4px 0 0 black",
                  width: "100%",
                  textAlign: "center",
                }}>
                <p
                  className="fr-mb-1w"
                  style={{
                    fontSize: "2rem",
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}>
                  {loading ? "..." : (data?.valeur ?? 0).toLocaleString("fr-FR")}
                </p>
                <span className={`fr-badge fr-badge--sm fr-badge--no-icon ${badgeClass}`}>
                  {label}
                </span>
                {data?.variation !== null && data?.variation !== undefined && (
                  <div className="fr-mt-1w">
                    <VariationBadge variation={data.variation} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
