"use client";

import { useEffect, useState } from "react";
import { getAmoStatistiquesAction } from "@/features/backoffice/espace-amo/statistiques/actions";
import type { AmoStatistiques } from "@/features/backoffice/espace-amo/statistiques/domain/types";
import { StatTile } from "../../shared";

/**
 * Panel des statistiques pour l'espace AMO
 *
 * Affiche les indicateurs clés :
 * - Nombre de dossiers en cours d'accompagnement
 * - Nombre de demandes d'accompagnement (acceptées / refusées)
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

  const { indicateursCles } = stats;

  return (
    <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
      <div className="fr-container">
        {/* Indicateurs clés */}
        <div className="fr-mb-6w">
          <h2 className="fr-h4 fr-mb-1w">Indicateurs clés</h2>
          <p className="fr-text-mention--grey fr-mb-3w">Sur la période</p>

          <div className="fr-grid-row fr-grid-row--gutters">
            <div className="fr-col-12 fr-col-md-6">
              <StatTile
                number={indicateursCles.nombreDossiersEnCoursAccompagnement.toLocaleString("fr-FR")}
                label="Dossiers en cours d'accompagnement"
              />
            </div>
            <div className="fr-col-12 fr-col-md-6">
              <StatTile
                number={indicateursCles.nombreDemandesAccompagnement.total.toLocaleString("fr-FR")}
                label={`Demandes d'accompagnement traitées (${indicateursCles.nombreDemandesAccompagnement.acceptees} acceptées - ${indicateursCles.nombreDemandesAccompagnement.refusees} refusées)`}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
