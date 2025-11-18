"use client";

import EligibiliteDemarcheInfo from "./EligibiliteDemarcheInfo";
import EligibiliteDossiersList from "./EligibiliteDossiersList";
import EligibiliteDemarcheSchema from "./EligibiliteDemarcheSchema";
import type { ActionResult } from "@/shared/types";
import type { DemarcheDetailed, DossiersConnection } from "@/features/parcours/dossiers-ds/adapters/graphql/types";

interface EligibilitePanelProps {
  demarcheResponse: ActionResult<DemarcheDetailed>;
  schemaResponse: ActionResult<DemarcheDetailed>;
  dossiersResponse: ActionResult<DossiersConnection>;
}

export default function EligibilitePanel({
  demarcheResponse,
  schemaResponse,
  dossiersResponse,
}: EligibilitePanelProps) {
  // Si la démarche n'est pas accessible, afficher un message d'erreur
  if (!demarcheResponse.success) {
    return (
      <div className="fr-container fr-py-8w">
        <div className="fr-alert fr-alert--error">
          <h3 className="fr-alert__title">Erreur d'accès</h3>
          <p>
            Impossible d'accéder à la démarche d'éligibilité. Vérifiez que votre token API a les permissions
            nécessaires.
          </p>
          <p className="fr-text--sm fr-mt-2w">Erreur : {demarcheResponse.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container fr-mb-8v">
      <div className="fr-tabs">
        <ul className="fr-tabs__list" role="tablist" aria-label="Système d'onglets statistiques">
          {/* Onglets détail démarche */}
          <li role="presentation">
            <button
              type="button"
              id="eligibilite-tab-0"
              className="fr-tabs__tab"
              tabIndex={0}
              role="tab"
              aria-selected="true"
              aria-controls="eligibilite-tab-0-panel">
              Détail de la démarche
            </button>
          </li>

          {/* Onglets liste dossiers */}
          <li role="presentation">
            <button
              type="button"
              id="eligibilite-tab-1"
              className="fr-tabs__tab"
              tabIndex={-1}
              role="tab"
              aria-selected="false"
              aria-controls="eligibilite-tab-1-panel">
              Liste des dossiers
            </button>
          </li>
        </ul>

        {/* Détail de la démarche */}
        <div
          id="eligibilite-tab-0-panel"
          className="fr-tabs__panel fr-tabs__panel--selected"
          role="tabpanel"
          aria-labelledby="eligibilite-tab-0"
          tabIndex={0}>
          <EligibiliteDemarcheInfo demarche={demarcheResponse.data} />
          <div className="fr-mt-6w">
            <EligibiliteDemarcheSchema
              champDescriptors={
                schemaResponse.success ? schemaResponse.data?.activeRevision?.champDescriptors : undefined
              }
            />
          </div>
        </div>

        {/* Liste des dossiers */}
        <div
          id="eligibilite-tab-1-panel"
          className="fr-tabs__panel"
          role="tabpanel"
          aria-labelledby="eligibilite-tab-1"
          tabIndex={0}>
          <EligibiliteDossiersList
            dossiersConnection={dossiersResponse.success ? dossiersResponse.data : null}
            demarcheId={demarcheResponse.data.number}
          />
        </div>
      </div>
    </div>
  );
}
