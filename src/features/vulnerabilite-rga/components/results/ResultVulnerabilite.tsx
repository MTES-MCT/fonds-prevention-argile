"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { SyntheseResultat } from "./SyntheseResultat";
import { CalloutExpertRga } from "./CalloutExpertRga";
import { ComprendreSourcesVulnerabilite } from "./ComprendreSourcesVulnerabilite";
import { RecommandationsList } from "./RecommandationsList";
import {
  compterPoints,
  type PointVulnerabilite,
  type VulnerabiliteResultat,
} from "../../domain/services/categorisation.service";
import { getSectionsRecommandations } from "../../domain/services/recommandations.service";
import { buildSyntheseResultat } from "../../domain/services/synthese-resultat.service";
import { remplitCriteresEligibiliteFonds } from "../../domain/services/eligibilite-fonds.service";
import type { PartialVulnerabiliteReponses, ReponseAleaRga } from "../../domain/types/vulnerabilite-reponses.types";

// Classes redéclarées plutôt qu'importées de `TelechargerPdfButton` : un import statique
// depuis ce module y ramènerait `@react-pdf/renderer` et annulerait le découpage.
const CLASSES_BOUTON_PDF = "fr-btn fr-btn--secondary !w-full md:!w-auto justify-center";

// En statique, `@react-pdf/renderer` (~256 Ko gzip) entrait dans le first-load de
// /vulnerabilite-rga et de l'iframe partenaire — tout le questionnaire avant que ce bouton existe.
const TelechargerPdfButton = dynamic(() => import("../pdf/TelechargerPdfButton").then((m) => m.TelechargerPdfButton), {
  ssr: false,
  loading: () => (
    <button type="button" className={CLASSES_BOUTON_PDF} disabled>
      Préparation du PDF...
    </button>
  ),
});

interface ContenuResultatVulnerabiliteProps {
  aleaRga: ReponseAleaRga | undefined;
  points: PointVulnerabilite[];
  eligibleFonds: boolean;
  /** Boutons de bas de page : propres à chaque écran (recommencer, retour au compte). */
  actions: ReactNode;
  /** Message d'état au-dessus du titre (ex. enregistrement du test fait par un agent). */
  entete?: ReactNode;
}

/** Corps du résultat, partagé entre la fin du simulateur et la page de consultation du compte. */
export function ContenuResultatVulnerabilite({
  aleaRga,
  points,
  eligibleFonds,
  actions,
  entete,
}: ContenuResultatVulnerabiliteProps) {
  const synthese = buildSyntheseResultat(aleaRga, compterPoints(points));
  const sections = getSectionsRecommandations(points);

  return (
    <div className="bg-[var(--background-alt-grey)] md:bg-transparent">
      <div className="fr-container fr-mb-8w">
        <div className="fr-grid-row fr-grid-row--center">
          <div className="fr-col-12 fr-col-md-8 fr-col-lg-8 md:bg-[var(--background-alt-grey)] p-0 md:p-10">
            <div className="px-4 md:px-6 pb-4 md:pb-0 fr-mt-3w md:fr-mt-4w">
              {entete}
              <h1 className="fr-h4 fr-mb-4w">Les points de vulnérabilité de votre logement</h1>

              <SyntheseResultat synthese={synthese} />
              <CalloutExpertRga eligibleFonds={eligibleFonds} />
              <ComprendreSourcesVulnerabilite />
              <RecommandationsList sections={sections} />

              <div className="flex flex-col md:flex-row md:flex-wrap md:justify-end gap-3 fr-mt-4w">
                <TelechargerPdfButton synthese={synthese} sections={sections} eligibleFonds={eligibleFonds} />
                {actions}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ResultVulnerabiliteProps {
  answers: PartialVulnerabiliteReponses;
  result: VulnerabiliteResultat;
  onRestart: () => void;
}

export function ResultVulnerabilite({ answers, result, onRestart }: ResultVulnerabiliteProps) {
  return (
    <ContenuResultatVulnerabilite
      aleaRga={answers.adresse?.aleaRga}
      points={result.points}
      eligibleFonds={remplitCriteresEligibiliteFonds(answers)}
      actions={
        <button
          type="button"
          className="fr-btn fr-btn--secondary !w-full md:!w-auto justify-center"
          onClick={onRestart}>
          Recommencer le simulateur
        </button>
      }
    />
  );
}
