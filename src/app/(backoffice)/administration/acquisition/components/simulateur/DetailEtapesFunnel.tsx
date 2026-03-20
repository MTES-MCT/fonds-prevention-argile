"use client";

import type { FunnelStatistiques, FunnelStep } from "@/features/backoffice/administration/acquisition/domain/types/matomo-funnels.types";

interface DetailEtapesFunnelProps {
  funnel: FunnelStatistiques | null;
  loading: boolean;
}

/**
 * Carte "Detail des etapes du funnel" — tableau des etapes du simulateur RGA.
 * Colonnes : Raison, VU, Conv., Abandons.
 */
export default function DetailEtapesFunnel({ funnel, loading }: DetailEtapesFunnelProps) {
  if (loading) {
    return (
      <div
        className="fr-p-3w"
        style={{
          backgroundColor: "var(--background-default-grey)",
          border: "1px solid var(--border-default-grey)",
        }}>
        <p className="fr-text--lg fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
          Chargement...
        </p>
      </div>
    );
  }

  if (!funnel || funnel.etapes.length === 0) {
    return (
      <div
        className="fr-p-3w"
        style={{
          backgroundColor: "var(--background-default-grey)",
          border: "1px solid var(--border-default-grey)",
        }}>
        <h2 className="fr-text--lg fr-mb-0" style={{ fontWeight: 700 }}>
          Detail des etapes du funnel
        </h2>
        <p className="fr-mt-2w fr-text--sm" style={{ color: "var(--text-mention-grey)" }}>
          Les donnees du funnel ne sont pas disponibles.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "var(--background-default-grey)",
        border: "1px solid var(--border-default-grey)",
        height: "100%",
      }}>
      {/* Header */}
      <div className="fr-px-2w fr-pt-2w">
        <h2 className="fr-text--lg fr-mb-0" style={{ fontWeight: 700 }}>
          Detail des etapes du funnel
        </h2>
        <p className="fr-text--sm fr-mb-0 fr-mt-1v" style={{ color: "var(--text-mention-grey)" }}>
          Tous utilisateurs confondus
        </p>
      </div>

      {/* Tableau DSFR */}
      <div className="fr-table fr-mb-0 fr-px-4v fr-mb-4w">
        <div className="fr-table__wrapper" style={{ overflow: "hidden" }}>
          <div className="fr-table__container" style={{ overflow: "hidden" }}>
            <div className="fr-table__content">
              <table>
                <caption className="sr-only">Detail des etapes du funnel simulateur</caption>
                <thead>
                  <tr>
                    <th scope="col">Raison</th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      VU
                    </th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      Conv.
                    </th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      Abandons
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {funnel.etapes.map((etape: FunnelStep) => (
                    <tr key={etape.position}>
                      <td className="fr-text--sm">
                        <strong>{etape.position}.</strong> {etape.nom}
                      </td>
                      <td className="fr-text--sm" style={{ textAlign: "right" }}>
                        {etape.visiteurs.toLocaleString("fr-FR")}
                      </td>
                      <td className="fr-text--sm" style={{ textAlign: "right" }}>
                        {etape.conversions.toLocaleString("fr-FR")}{" "}
                        <span style={{ color: "var(--text-default-success)" }}>
                          ({etape.tauxConversion.toLocaleString("fr-FR")} %)
                        </span>
                      </td>
                      <td className="fr-text--sm" style={{ textAlign: "right" }}>
                        {etape.abandons.toLocaleString("fr-FR")}{" "}
                        <span style={{ color: "var(--text-default-error)" }}>
                          ({etape.tauxAbandon.toLocaleString("fr-FR")} %)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
