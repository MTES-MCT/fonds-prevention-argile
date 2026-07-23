import { useState } from "react";
import Link from "next/link";
import { useParcours } from "../../context/useParcours";
import { Step } from "../../domain";
import { DSStatus } from "@/features/parcours/dossiers-ds/domain";
import { useAmoMode } from "@/features/parcours/amo/hooks";
import { AmoMode } from "@/features/parcours/amo/domain/value-objects/departements-amo";
import {
  getStepListItems,
  peutAnnulerAccompagnement,
  requiertAccordAmo,
  type StepListItem,
} from "@/features/parcours/amo/domain/value-objects";
import { AnnulerAccompagnementModal } from "@/features/parcours/amo/components/steps/AnnulerAccompagnementModal";
import { DossierTimeline } from "@/features/parcours/dossiers-ds/components/DossierTimeline";

const COMPLETED_STYLE: React.CSSProperties = {
  textDecoration: "line-through",
  opacity: 0.7,
  pointerEvents: "none",
};

export default function MaListe() {
  const { currentStep, statutAmo, getDossierUrl, lastDSStatus, validationAmoComplete, getDSStatusByStep, dossiers } =
    useParcours();
  const amoMode = useAmoMode();
  const [isAnnulerOpen, setIsAnnulerOpen] = useState(false);

  const items = getStepListItems(amoMode, statutAmo, currentStep, lastDSStatus === DSStatus.ACCEPTE);
  // Dates clés (brouillon/dépôt/instruction/décision) du dossier d'éligibilité,
  // affichées sous l'item correspondant de la liste (cf. ParcoursDemandeur côté agent).
  const eligibiliteDossier = dossiers?.find((d) => d.demarcheEtape === Step.ELIGIBILITE);

  // L'annulation n'existe qu'en mode FACULTATIF : ailleurs l'AMO est imposé par le
  // département (même garde que `skipAmoStepForUser`, revérifiée côté serveur).
  const peutAnnuler =
    amoMode === AmoMode.FACULTATIF &&
    statutAmo !== null &&
    validationAmoComplete !== null &&
    peutAnnulerAccompagnement({
      statut: statutAmo,
      demandeArretAt: validationAmoComplete.demandeArretAt,
      eligibiliteDsStatus: getDSStatusByStep(Step.ELIGIBILITE) ?? null,
    });
  const arretEnAttente = Boolean(validationAmoComplete?.demandeArretAt);
  const accordAmoRequis =
    statutAmo !== null && requiertAccordAmo(statutAmo, validationAmoComplete?.estMandataireFinancier ?? null);

  return (
    <>
      <div className="fr-card">
        <div className="fr-card__body">
          <h2 className="fr-card__title">Ma liste</h2>
          <div className="fr-card__desc">
            <ol type="1" className="fr-list space-y-2">
              {items.map((item) => (
                <li key={item.key}>
                  {renderItemLink(item, getDossierUrl)}
                  {item.key === "choix-accompagnement" && peutAnnuler && (
                    <button
                      type="button"
                      className="fr-link fr-link--sm fr-ml-1w"
                      onClick={() => setIsAnnulerOpen(true)}>
                      Annuler
                    </button>
                  )}
                  {item.key === "choix-accompagnement" && arretEnAttente && (
                    <span className="fr-text--xs fr-text-mention--grey fr-ml-1w">Arrêt demandé</span>
                  )}
                  {item.key === "eligibilite" && eligibiliteDossier && (
                    <div className="fr-ml-3v fr-mt-1v text-gray-500">
                      <DossierTimeline dossier={eligibiliteDossier} />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <AnnulerAccompagnementModal
        isOpen={isAnnulerOpen}
        onClose={() => setIsAnnulerOpen(false)}
        accordAmoRequis={accordAmoRequis}
        entrepriseAmo={validationAmoComplete?.entrepriseAmo ?? null}
      />
    </>
  );
}

function renderItemLink(item: StepListItem, getDossierUrl: (step: Step) => string | null) {
  // Item lié à l'étape AMO : ancre interne (#choix-amo)
  if (item.isAmoAnchor) {
    if (item.state === "completed") {
      return (
        <span className="fr-link" style={COMPLETED_STYLE}>
          {item.label} <span className="fr-icon-checkbox-circle-fill text-green-800" aria-hidden="true" />
        </span>
      );
    }
    if (item.state === "active") {
      return (
        <Link className="fr-link" href="#choix-amo">
          {item.label}
        </Link>
      );
    }
    return (
      <a aria-disabled="true" role="link" className="fr-link">
        {item.label}
      </a>
    );
  }

  // Item lié à une étape DS (lien externe vers le dossier Démarches Simplifiées)
  if (item.state === "completed") {
    return (
      <span className="fr-link" style={COMPLETED_STYLE}>
        {item.label} <span className="fr-icon-checkbox-circle-fill text-green-800" aria-hidden="true" />
      </span>
    );
  }
  if (item.state === "active" && item.step) {
    const url = getDossierUrl(item.step);
    return (
      <Link target="_blank" rel="noopener external" className="fr-link" href={url || "#"}>
        {item.label}
      </Link>
    );
  }
  return (
    <a aria-disabled="true" role="link" className="fr-link">
      {item.label}
    </a>
  );
}
