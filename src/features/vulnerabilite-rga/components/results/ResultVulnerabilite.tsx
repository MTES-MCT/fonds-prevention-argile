import { VulnerabiliteGauge } from "./VulnerabiliteGauge";
import { RecommandationsList } from "./RecommandationsList";
import { getRecommandationsPrioritaires } from "../../domain/services/recommandations.service";
import type { VulnerabiliteScoreResult } from "../../domain/services/scoring.service";

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
            <div className="px-4 md:px-8 pb-4 md:pb-0 fr-mt-4w md:fr-mt-6w">
              <h4 className="fr-mb-4w">Votre niveau de vulnérabilité estimé</h4>

              <div className="flex justify-center fr-mb-3w">
                <VulnerabiliteGauge score={result.scoreGlobal} />
              </div>

              <RecommandationsList recommandations={recommandations} />

              <div className="flex flex-col md:flex-row md:justify-end fr-mt-4w">
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
