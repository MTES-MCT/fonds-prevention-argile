"use client";

import { AmoSeedUpload } from "./AmoSeedUpload";
import { AmoList } from "./AmoList";

export default function AmoPanel() {
  return (
    <div className="container fr-mb-8v">
      <div className="fr-tabs">
        <ul className="fr-tabs__list" role="tablist" aria-label="Système d'onglets statistiques">
          {/* Onglets de la liste des AMO */}
          <li role="presentation">
            <button
              type="button"
              id="amo-tab-0"
              className="fr-tabs__tab"
              tabIndex={0}
              role="tab"
              aria-selected="true"
              aria-controls="amo-tab-0-panel">
              Listes des entreprises AMO
            </button>
          </li>

          {/* Onglets import des entreprises AMO */}
          <li role="presentation">
            <button
              type="button"
              id="amo-tab-1"
              className="fr-tabs__tab"
              tabIndex={-1}
              role="tab"
              aria-selected="false"
              aria-controls="amo-tab-1-panel">
              Import des entreprises AMO
            </button>
          </li>
        </ul>

        {/* Listes des entreprises AMO */}
        <div
          id="amo-tab-0-panel"
          className="fr-tabs__panel fr-tabs__panel--selected"
          role="tabpanel"
          aria-labelledby="amo-tab-0"
          tabIndex={0}>
          <AmoList />
        </div>

        {/* Import des entreprises AMO */}
        <div id="amo-tab-1-panel" className="fr-tabs__panel" role="tabpanel" aria-labelledby="amo-tab-1" tabIndex={0}>
          <AmoSeedUpload />
        </div>
      </div>
    </div>
  );
}
