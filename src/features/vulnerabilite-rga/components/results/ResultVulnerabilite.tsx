"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { VulnerabiliteGauge } from "./VulnerabiliteGauge";
import { RecommandationsList } from "./RecommandationsList";
import { VulnerabilitePdfDocument } from "../pdf/VulnerabilitePdfDocument";
import { getRecommandationsPrioritaires } from "../../domain/services/recommandations.service";
import type { VulnerabiliteScoreResult } from "../../domain/services/scoring.service";
import { useMatomo } from "@/shared/components/Matomo/useMatomo";
import { MATOMO_EVENTS } from "@/shared/constants";

interface ResultVulnerabiliteProps {
  result: VulnerabiliteScoreResult;
  onRestart: () => void;
}

export function ResultVulnerabilite({ result, onRestart }: ResultVulnerabiliteProps) {
  const recommandations = getRecommandationsPrioritaires(result);
  const { trackEvent } = useMatomo();

  return (
    <div className="bg-[var(--background-alt-grey)] md:bg-transparent">
      <div className="fr-container fr-mb-8w">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-8 md:bg-[var(--background-alt-grey)] p-0 md:p-10">
            <div className="px-4 md:px-6 pb-4 md:pb-0 fr-mt-3w md:fr-mt-4w">
              <h4 className="fr-mb-4w">Votre niveau de vulnérabilité estimé</h4>

              <div className="flex justify-center fr-mb-3w">
                <VulnerabiliteGauge score={result.scoreGlobal} />
              </div>

              <RecommandationsList recommandations={recommandations} />

              <div className="flex flex-col md:flex-row md:justify-end fr-mt-4w">
                {/* toBlob() démarre au montage (comportement PDFDownloadLink) : coût unique et
                    négligeable pour un document texte, contre un clic instantané pour l'usager. */}
                <PDFDownloadLink
                  document={<VulnerabilitePdfDocument score={result.scoreGlobal} recommandations={recommandations} />}
                  fileName="fonds-prevention-argile-vulnerabilite-rga.pdf"
                  className="fr-btn fr-btn--secondary !w-full md:!w-auto justify-center fr-mb-2w md:fr-mb-0 md:fr-mr-2w"
                  onClick={() => trackEvent(MATOMO_EVENTS.VULNERABILITE_PDF_DOWNLOAD)}>
                  {({ loading }) => (loading ? "Préparation du PDF..." : "Télécharger les solutions en PDF")}
                </PDFDownloadLink>

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
