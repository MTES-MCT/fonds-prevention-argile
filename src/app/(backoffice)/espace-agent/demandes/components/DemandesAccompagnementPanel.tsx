"use client";

import { useEffect, useState } from "react";
import { getAmoAccueilDataAction } from "@/features/backoffice/espace-agent/demandes/actions";
import type { AmoAccueilData } from "@/features/backoffice/espace-agent/demandes/domain/types";
import { DemandesAccompagnementHeader } from "./DemandesAccompagnementHeader";
import { DemandesAccompagnementTable } from "./DemandesAccompagnementTable";

/**
 * Panel d'accueil pour les demandes d'accompagnement AMO
 *
 * Charge les données et affiche :
 * - Header avec les 2 StatTiles (demandes en attente + dossiers suivis)
 * - Tableau des demandes d'accompagnement à traiter
 */
export function DemandesAccompagnementPanel() {
  const [data, setData] = useState<AmoAccueilData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      const result = await getAmoAccueilDataAction();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <>
        <div className="fr-container fr-py-4w">
          <p>Chargement...</p>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="fr-container fr-py-4w">
          <div className="fr-alert fr-alert--error">
            <p>{error}</p>
          </div>
        </div>
      </>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <>
      <DemandesAccompagnementHeader
        nombreDemandesEnAttente={data.nombreDemandesEnAttente}
        nombreDossiersSuivis={data.nombreDossiersSuivis}
      />

      <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          <h2 className="fr-h4 fr-mb-4w">
            {data.nombreDemandesEnAttente} demande{data.nombreDemandesEnAttente > 1 ? "s" : ""} d&apos;accompagnement à
            traiter
          </h2>

          <DemandesAccompagnementTable demandes={data.demandesATraiter} />
        </div>
      </section>
    </>
  );
}
