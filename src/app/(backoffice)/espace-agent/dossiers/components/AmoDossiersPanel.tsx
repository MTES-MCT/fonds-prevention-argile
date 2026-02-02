"use client";

import { useEffect, useState } from "react";
import { getAmoDossiersDataAction } from "@/features/backoffice/espace-agent/dossiers/actions";
import type { AmoDossiersData } from "@/features/backoffice/espace-agent/dossiers/domain/types";
import { AmoDossiersHeader } from "./AmoDossiersHeader";
import { DossiersSuivisTable } from "./DossiersSuivisTable";
import Link from "next/link";

/**
 * Panel des dossiers suivis pour l'espace AMO
 */
export function AmoDossiersPanel() {
  const [data, setData] = useState<AmoDossiersData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const result = await getAmoDossiersDataAction();
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error);
        }
      } catch (e) {
        setError("Erreur lors du chargement des données");
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  if (isLoading) {
    return (
      <>
        <AmoDossiersHeader nombreDossiers={0} />
        <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
          <div className="fr-container">
            <p>Chargement...</p>
          </div>
        </section>
      </>
    );
  }

  if (error) {
    return (
      <>
        <AmoDossiersHeader nombreDossiers={0} />
        <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
          <div className="fr-container">
            <div className="fr-alert fr-alert--error">
              <h3 className="fr-alert__title">Erreur</h3>
              <p>{error}</p>
            </div>
          </div>
        </section>
      </>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <>
      <AmoDossiersHeader nombreDossiers={data.nombreDossiersSuivis} />
      <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          <h2>
            {data.nombreDossiersSuivis} dossier{data.nombreDossiersSuivis > 1 ? "s" : ""} suivi
            {data.nombreDossiersSuivis > 1 ? "s" : ""}
          </h2>
          <DossiersSuivisTable dossiers={data.dossiers} />

          <div className="fr-callout">
            <h3 className="fr-callout__title">Le saviez-vous ?</h3>
            <p className="fr-callout__text">
              Un demandeur peut vous inviter à consulter et remplir ses formulaires. Les options d’accès sont
              disponibles sur son compte{" "}
              <Link href="https://demarche.numerique.gouv.fr" target="_blank" rel="noopener noreferrer">
                demarche.numerique.gouv.fr
              </Link>{" "}
              (dans chaque formulaire).
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
