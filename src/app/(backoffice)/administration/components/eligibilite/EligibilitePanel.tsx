"use client";

import { useState } from "react";
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

type ViewId = "demarche" | "dossiers";

export default function EligibilitePanel({
  demarcheResponse,
  schemaResponse,
  dossiersResponse,
}: EligibilitePanelProps) {
  const [activeView, setActiveView] = useState<ViewId>("demarche");

  // Si la démarche n'est pas accessible, afficher un message d'erreur
  if (!demarcheResponse.success) {
    return (
      <div className="fr-py-8w">
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
    <div className="w-full">
      {/* En-tête */}
      <div className="fr-mb-6w">
        <h1 className="fr-h2 fr-mb-2w">Éligibilité</h1>
        <p className="fr-text--lg fr-text-mention--grey">
          Gérez la démarche d'éligibilité et consultez les dossiers soumis via Démarches Simplifiées.
        </p>
      </div>

      {/* Contrôle segmenté */}
      <fieldset className="fr-segmented fr-mb-6w">
        <legend className="fr-segmented__legend fr-sr-only">Sélection de la vue éligibilité</legend>
        <div className="fr-segmented__elements">
          <div className="fr-segmented__element">
            <input
              value="demarche"
              checked={activeView === "demarche"}
              type="radio"
              id="segmented-eligibilite-1"
              name="segmented-eligibilite"
              onChange={() => setActiveView("demarche")}
            />
            <label className="fr-icon-file-text-line fr-label" htmlFor="segmented-eligibilite-1">
              Détail de la démarche
            </label>
          </div>
          <div className="fr-segmented__element">
            <input
              value="dossiers"
              checked={activeView === "dossiers"}
              type="radio"
              id="segmented-eligibilite-2"
              name="segmented-eligibilite"
              onChange={() => setActiveView("dossiers")}
            />
            <label className="fr-icon-folder-2-line fr-label" htmlFor="segmented-eligibilite-2">
              Liste des dossiers
            </label>
          </div>
        </div>
      </fieldset>

      {/* Vue Détail de la démarche */}
      {activeView === "demarche" && (
        <div>
          <h2 className="fr-h3 fr-mb-3w">Détail de la démarche</h2>
          <EligibiliteDemarcheInfo demarche={demarcheResponse.data} />
          <div className="fr-mt-6w">
            <EligibiliteDemarcheSchema
              champDescriptors={
                schemaResponse.success ? schemaResponse.data?.activeRevision?.champDescriptors : undefined
              }
            />
          </div>
        </div>
      )}

      {/* Vue Liste des dossiers */}
      {activeView === "dossiers" && (
        <div>
          <h2 className="fr-h3 fr-mb-3w">Liste des dossiers</h2>
          <EligibiliteDossiersList
            dossiersConnection={dossiersResponse.success ? dossiersResponse.data : null}
            demarcheId={demarcheResponse.data.number}
          />
        </div>
      )}
    </div>
  );
}
