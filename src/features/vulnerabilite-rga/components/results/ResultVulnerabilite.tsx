"use client";

import dynamic from "next/dynamic";
import { SyntheseResultat } from "./SyntheseResultat";
import { CalloutExpertRga } from "./CalloutExpertRga";
import { ComprendreSourcesVulnerabilite } from "./ComprendreSourcesVulnerabilite";
import { RecommandationsList } from "./RecommandationsList";
import { compterPoints, type VulnerabiliteResultat } from "../../domain/services/categorisation.service";
import { getSectionsRecommandations } from "../../domain/services/recommandations.service";
import { buildSyntheseResultat } from "../../domain/services/synthese-resultat.service";
import { remplitCriteresEligibiliteFonds } from "../../domain/services/eligibilite-fonds.service";
import type { PartialVulnerabiliteReponses } from "../../domain/types/vulnerabilite-reponses.types";

// Classes redéclarées plutôt qu'importées de `TelechargerPdfButton` : un import statique
// depuis ce module y ramènerait `@react-pdf/renderer` et annulerait le découpage.
const CLASSES_BOUTON_PDF = "fr-btn fr-btn--secondary !w-full md:!w-auto justify-center fr-mb-2w md:fr-mb-0 md:fr-mr-2w";

// En statique, `@react-pdf/renderer` (~256 Ko gzip) entrait dans le first-load de
// /vulnerabilite-rga et de l'iframe partenaire — 13 étapes avant que ce bouton existe.
const TelechargerPdfButton = dynamic(() => import("../pdf/TelechargerPdfButton").then((m) => m.TelechargerPdfButton), {
  ssr: false,
  loading: () => (
    <button type="button" className={CLASSES_BOUTON_PDF} disabled>
      Préparation du PDF...
    </button>
  ),
});

interface ResultVulnerabiliteProps {
  answers: PartialVulnerabiliteReponses;
  result: VulnerabiliteResultat;
  onRestart: () => void;
}

export function ResultVulnerabilite({ answers, result, onRestart }: ResultVulnerabiliteProps) {
  const synthese = buildSyntheseResultat(answers.adresse?.aleaRga, compterPoints(result.points));
  const sections = getSectionsRecommandations(result.points);

  return (
    <div className="bg-[var(--background-alt-grey)] md:bg-transparent">
      <div className="fr-container fr-mb-8w">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-8 md:bg-[var(--background-alt-grey)] p-0 md:p-10">
            <div className="px-4 md:px-6 pb-4 md:pb-0 fr-mt-3w md:fr-mt-4w">
              <h1 className="fr-h4 fr-mb-4w">Les points de vulnérabilité de votre logement</h1>

              <SyntheseResultat synthese={synthese} />
              <CalloutExpertRga afficherLienEligibilite={remplitCriteresEligibiliteFonds(answers)} />
              <ComprendreSourcesVulnerabilite />
              <RecommandationsList sections={sections} />

              <div className="flex flex-col md:flex-row md:justify-end fr-mt-4w">
                <TelechargerPdfButton synthese={synthese} sections={sections} />

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
