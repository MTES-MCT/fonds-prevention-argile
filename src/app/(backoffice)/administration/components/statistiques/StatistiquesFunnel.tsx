"use client";

import type { FunnelStatistiques, FunnelStep } from "@/features/backoffice";
import StatCard from "../shared/StatCard";

interface StatistiquesFunnelProps {
  funnel: FunnelStatistiques;
}

export default function StatistiquesFunnel({ funnel }: StatistiquesFunnelProps) {
  if (funnel.etapes.length === 0) {
    return (
      <div className="fr-alert fr-alert--info">
        <p>Aucune donnée disponible pour le funnel</p>
      </div>
    );
  }

  return (
    <div>
      {/* Métriques globales */}
      <div className="fr-grid-row fr-grid-row--gutters fr-mb-4w">
        <StatCard label="Visiteurs initiaux" number={funnel.visiteursInitiaux.toLocaleString("fr-FR")} />
        <StatCard label="Conversions finales" number={funnel.conversionsFinales.toLocaleString("fr-FR")} />
        <StatCard
          label="Taux de conversion global"
          number={`${funnel.tauxConversionGlobal.toLocaleString("fr-FR")} %`}
        />
      </div>

      {/* Tableau des étapes */}
      <h3 className="fr-h4 fr-mb-2w">Détail des étapes du funnel</h3>
      <div className="fr-table fr-table--bordered">
        <table>
          <thead>
            <tr>
              <th>Étape</th>
              <th>Visiteurs</th>
              <th>Conversions</th>
              <th>Taux conversion</th>
              <th>Abandons</th>
              <th>Taux abandon</th>
            </tr>
          </thead>
          <tbody>
            {funnel.etapes.map((etape: FunnelStep) => (
              <tr key={etape.position}>
                <td>
                  <strong>{etape.position}.</strong> {etape.nom}
                </td>
                <td>{etape.visiteurs.toLocaleString("fr-FR")}</td>
                <td>{etape.conversions.toLocaleString("fr-FR")}</td>
                <td>
                  <span style={{ color: "var(--text-default-success)" }}>
                    {etape.tauxConversion.toLocaleString("fr-FR")} %
                  </span>
                </td>
                <td>{etape.abandons.toLocaleString("fr-FR")}</td>
                <td>
                  <span style={{ color: "var(--text-default-error)" }}>
                    {etape.tauxAbandon.toLocaleString("fr-FR")} %
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
