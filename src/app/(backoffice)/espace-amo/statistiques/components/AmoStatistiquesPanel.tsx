"use client";

import { useEffect, useState } from "react";
import { getAmoStatistiquesAction } from "@/features/backoffice/espace-amo/statistiques/actions";
import type { AmoStatistiques } from "@/features/backoffice/espace-amo/statistiques/domain/types";
import { IndicateursCles } from "./IndicateursCles";
import { RepartitionParEtape } from "./RepartitionParEtape";
import { RepartitionParRevenu } from "./RepartitionParRevenu";
import { TopCommunes } from "./TopCommunes";

/**
 * Panel des statistiques pour l'espace AMO
 *
 * Affiche les indicateurs clés :
 * - Nombre de dossiers en cours d'accompagnement
 * - Nombre de demandes d'accompagnement (acceptées / refusées)
 * - Répartition par étape du parcours
 * - Répartition par revenus (à venir)
 * - Top 5 des communes (à venir)
 */
export function AmoStatistiquesPanel() {
  const [stats, setStats] = useState<AmoStatistiques | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      setError(null);

      const result = await getAmoStatistiquesAction();

      if (result.success) {
        setStats(result.data);
      } else {
        setError(result.error);
      }

      setLoading(false);
    }

    loadStats();
  }, []);

  if (loading) {
    return (
      <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
        <div className="fr-container fr-py-4w">
          <p>Chargement des statistiques...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
        <div className="fr-container fr-py-4w">
          <div className="fr-alert fr-alert--error">
            <p>{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
      <div className="fr-container">
        <IndicateursCles indicateurs={stats.indicateursCles} />
        <RepartitionParEtape repartition={stats.repartitionParEtape} />
        <RepartitionParRevenu />
        <TopCommunes />
      </div>
    </section>
  );
}
