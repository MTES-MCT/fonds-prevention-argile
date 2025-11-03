"use client";

import { useState } from "react";
import DossierDetail from "./DossierDetail";
import { DossiersConnection } from "@/features/parcours/dossiers-ds/adapters/graphql";

interface DossiersListProps {
  dossiersConnection: DossiersConnection | null;
  demarcheId: number;
}

function getStateLabel(state: string): string {
  const stateLabels: Record<string, string> = {
    en_construction: "En construction",
    en_instruction: "En instruction",
    accepte: "Accepté",
    refuse: "Refusé",
    sans_suite: "Sans suite",
  };
  return stateLabels[state] || state;
}

function getStateBadgeClass(state: string): string {
  const stateClasses: Record<string, string> = {
    en_construction: "fr-badge--new",
    en_instruction: "fr-badge--info",
    accepte: "fr-badge--success",
    refuse: "fr-badge--error",
    sans_suite: "fr-badge--warning",
  };
  return `fr-badge ${stateClasses[state] || ""}`;
}

export default function DossiersList({
  dossiersConnection,
}: DossiersListProps) {
  const [selectedDossier, setSelectedDossier] = useState<number | null>(null);
  const [filterState, setFilterState] = useState<string>("all");

  const dossiers = dossiersConnection?.nodes || [];
  const hasMore = dossiersConnection?.pageInfo?.hasNextPage || false;

  // Filtrer les dossiers selon l'état sélectionné
  const filteredDossiers =
    filterState === "all"
      ? dossiers
      : dossiers.filter((d) => d.state === filterState);

  // Calculer les statistiques
  const stats = dossiers.reduce(
    (acc, dossier) => {
      acc.total++;
      acc.byState[dossier.state] = (acc.byState[dossier.state] || 0) + 1;
      if (dossier.archived) acc.archived++;
      return acc;
    },
    {
      total: 0,
      byState: {} as Record<string, number>,
      archived: 0,
    }
  );

  return (
    <>
      {/* Statistiques */}
      <div className="fr-grid-row fr-grid-row--gutters fr-mb-4w">
        <div className="fr-col-12 fr-col-md-3">
          <div className="fr-tile fr-tile--sm">
            <div className="fr-tile__body">
              <h4 className="fr-tile__title">Total</h4>
              <p className="fr-display-xs fr-mb-0">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="fr-col-12 fr-col-md-3">
          <div className="fr-tile fr-tile--sm">
            <div className="fr-tile__body">
              <h4 className="fr-tile__title">En construction</h4>
              <p className="fr-display-xs fr-mb-0">
                {stats.byState.en_construction || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="fr-col-12 fr-col-md-3">
          <div className="fr-tile fr-tile--sm">
            <div className="fr-tile__body">
              <h4 className="fr-tile__title">En instruction</h4>
              <p className="fr-display-xs fr-mb-0">
                {stats.byState.en_instruction || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="fr-col-12 fr-col-md-3">
          <div className="fr-tile fr-tile--sm">
            <div className="fr-tile__body">
              <h4 className="fr-tile__title">Acceptés</h4>
              <p className="fr-display-xs fr-mb-0 fr-text--success">
                {stats.byState.accepte || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="fr-mb-3w">
        <div className="fr-segmented">
          <div className="fr-segmented__elements">
            <button
              className={`fr-segmented__element ${filterState === "all" ? "fr-segmented__element--selected" : ""}`}
              onClick={() => setFilterState("all")}
            >
              Tous ({stats.total})
            </button>
            <button
              className={`fr-segmented__element ${filterState === "en_construction" ? "fr-segmented__element--selected" : ""}`}
              onClick={() => setFilterState("en_construction")}
            >
              En construction ({stats.byState.en_construction || 0})
            </button>
            <button
              className={`fr-segmented__element ${filterState === "en_instruction" ? "fr-segmented__element--selected" : ""}`}
              onClick={() => setFilterState("en_instruction")}
            >
              En instruction ({stats.byState.en_instruction || 0})
            </button>
            <button
              className={`fr-segmented__element ${filterState === "accepte" ? "fr-segmented__element--selected" : ""}`}
              onClick={() => setFilterState("accepte")}
            >
              Acceptés ({stats.byState.accepte || 0})
            </button>
          </div>
        </div>
      </div>

      {/* Liste des dossiers */}
      {filteredDossiers.length === 0 ? (
        <div className="fr-notice fr-notice--info">
          <div className="fr-notice__body">
            <p className="fr-notice__title">Aucun dossier trouvé</p>
            <p className="fr-text--sm">
              {filterState === "all"
                ? "Cette démarche ne contient aucun dossier."
                : `Aucun dossier avec l'état "${getStateLabel(filterState)}".`}
            </p>
          </div>
        </div>
      ) : (
        <div className="fr-table">
          <table>
            <caption>
              {filteredDossiers.length} dossier(s) affiché(s)
              {hasMore && " (pagination disponible)"}
            </caption>
            <thead>
              <tr>
                <th scope="col">N°</th>
                <th scope="col">Email usager</th>
                <th scope="col">État</th>
                <th scope="col">Date dépôt</th>
                <th scope="col">Date traitement</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDossiers.map((dossier) => (
                <tr key={dossier.id}>
                  <td>
                    <span className="fr-text--bold">{dossier.number}</span>
                  </td>
                  <td>
                    {dossier.usager?.email || (
                      <span className="fr-text--mention-grey">—</span>
                    )}
                  </td>
                  <td>
                    <p
                      className={`${getStateBadgeClass(dossier.state)} fr-badge--sm fr-mb-0`}
                    >
                      {getStateLabel(dossier.state)}
                    </p>
                    {dossier.archived && (
                      <p className="fr-badge fr-badge--sm fr-badge--no-icon fr-mt-1v">
                        Archivé
                      </p>
                    )}
                  </td>
                  <td>
                    {dossier.datePassageEnConstruction ? (
                      new Date(
                        dossier.datePassageEnConstruction
                      ).toLocaleDateString("fr-FR")
                    ) : (
                      <span className="fr-text--mention-grey">—</span>
                    )}
                  </td>
                  <td>
                    {dossier.dateTraitement ? (
                      new Date(dossier.dateTraitement).toLocaleDateString(
                        "fr-FR"
                      )
                    ) : (
                      <span className="fr-text--mention-grey">En cours</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
                      onClick={() => setSelectedDossier(dossier.number)}
                    >
                      Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de détail du dossier */}
      {selectedDossier && (
        <DossierDetail
          dossierNumber={selectedDossier}
          onClose={() => setSelectedDossier(null)}
        />
      )}
    </>
  );
}
