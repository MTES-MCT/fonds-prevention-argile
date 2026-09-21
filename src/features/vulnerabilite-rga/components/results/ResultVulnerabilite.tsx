"use client";

import dynamic from "next/dynamic";
import { VulnerabiliteGauge } from "./VulnerabiliteGauge";
import { RecommandationsList } from "./RecommandationsList";
import { getRecommandationsPrioritaires } from "../../domain/services/recommandations.service";
import type { VulnerabiliteScoreResult } from "../../domain/services/scoring.service";

// Classes redéclarées plutôt qu'importées de `TelechargerPdfButton` : un import statique
// depuis ce module y ramènerait `@react-pdf/renderer` et annulerait le découpage.
const CLASSES_BOUTON_PDF = "fr-btn fr-btn--secondary !w-full md:!w-auto justify-center fr-mb-2w md:fr-mb-0 md:fr-mr-2w";

// En statique, `@react-pdf/renderer` (~256 Ko gzip) entrait dans le first-load de
// /vulnerabilite-rga et de l'iframe partenaire — 12 étapes avant que ce bouton existe.
const TelechargerPdfButton = dynamic(() => import("../pdf/TelechargerPdfButton").then((m) => m.TelechargerPdfButton), {
  ssr: false,
  loading: () => (
    <button type="button" className={CLASSES_BOUTON_PDF} disabled>
      Préparation du PDF...
    </button>
  ),
});

interface ResultVulnerabiliteProps {
  result: VulnerabiliteScoreResult;
  onRestart: () => void;
}

export function ResultVulnerabilite({ result, onRestart }: ResultVulnerabiliteProps) {
  const recommandations = getRecommandationsPrioritaires(result);

  return (
    <div className="bg-[var(--background-alt-grey)] md:bg-transparent">
      <div className="fr-container fr-mb-8w">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-8 md:bg-[var(--background-alt-grey)] p-0 md:p-10">
            <div className="px-4 md:px-6 pb-4 md:pb-0 fr-mt-3w md:fr-mt-4w">
              <h1 className="fr-h4 fr-mb-4w">Votre niveau de vulnérabilité estimé</h1>

              <div className="flex justify-center fr-mb-3w">
                <VulnerabiliteGauge score={result.scoreGlobal} />
              </div>

              <RecommandationsList recommandations={recommandations} />

              <div className="flex flex-col md:flex-row md:justify-end fr-mt-4w">
                <TelechargerPdfButton score={result.scoreGlobal} recommandations={recommandations} />

                <button
                  type="button"
                  className="fr-btn fr-btn--secondary !w-full md:!w-auto justify-center"
                  onClick={onRestart}>
                  Recommencer le simulateur
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
