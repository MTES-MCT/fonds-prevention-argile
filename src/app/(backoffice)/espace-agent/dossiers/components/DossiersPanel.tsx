"use client";

import { useEffect, useState } from "react";
import { getAmoDossiersDataAction } from "@/features/backoffice/espace-agent/dossiers/actions";
import type { AmoDossiersData } from "@/features/backoffice/espace-agent/dossiers/domain/types";
import { DossiersSuivisHeader } from "./DossiersSuivisHeader";
import { DossiersSuivisTable } from "./DossiersSuivisTable";
import Link from "next/link";

/**
 * Panel des dossiers pour l'espace AMO avec onglets Suivis / Archivés
 */
export function DossiersPanel() {
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
        <DossiersSuivisHeader nombreDossiers={0} />
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
        <DossiersSuivisHeader nombreDossiers={0} />
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
      <DossiersSuivisHeader nombreDossiers={data.nombreDossiersSuivis} />
      <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          <div className="fr-tabs">
            <ul className="fr-tabs__list" role="tablist" aria-label="Dossiers">
              <li role="presentation">
                <button
                  type="button"
                  id="tab-suivis"
                  className="fr-tabs__tab"
                  tabIndex={0}
                  role="tab"
                  aria-selected="true"
                  aria-controls="tab-suivis-panel">
                  <p className="fr-badge fr-badge--sm fr-mr-2v fr-badge--blue-cumulus">{data.nombreDossiersSuivis}</p>
                  👁️ Suivis
                </button>
              </li>
              <li role="presentation">
                <button
                  type="button"
                  id="tab-archives"
                  className="fr-tabs__tab"
                  tabIndex={-1}
                  role="tab"
                  aria-selected="false"
                  aria-controls="tab-archives-panel">
                  <p className="fr-badge fr-badge--sm fr-mr-2v fr-badge--blue-cumulus">{data.nombreDossiersArchives}</p>
                  🗂️ Archivés
                </button>
              </li>
            </ul>
            <div
              id="tab-suivis-panel"
              className="fr-tabs__panel fr-tabs__panel--selected"
              role="tabpanel"
              aria-labelledby="tab-suivis"
              tabIndex={0}>
              <DossiersSuivisTable dossiers={data.dossiersSuivis} />
            </div>
            <div
              id="tab-archives-panel"
              className="fr-tabs__panel"
              role="tabpanel"
              aria-labelledby="tab-archives"
              tabIndex={0}>
              <DossiersSuivisTable dossiers={data.dossiersArchives} />
            </div>
          </div>

          <div className="fr-callout">
            <h3 className="fr-callout__title">Le saviez-vous ?</h3>
            <p className="fr-callout__text">
              Un demandeur peut vous inviter à consulter et remplir ses formulaires. Les options d&apos;accès sont
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
