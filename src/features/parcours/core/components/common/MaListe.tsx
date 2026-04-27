import Link from "next/link";
import { useParcours } from "../../context/useParcours";
import { Step } from "../../domain";
import { DSStatus } from "@/features/parcours/dossiers-ds/domain";
import { useAmoMode } from "@/features/parcours/amo/hooks";
import { getStepListItems, type StepListItem } from "@/features/parcours/amo/domain/value-objects";

const COMPLETED_STYLE: React.CSSProperties = {
  textDecoration: "line-through",
  opacity: 0.7,
  pointerEvents: "none",
};

export default function MaListe() {
  const { currentStep, statutAmo, getDossierUrl, lastDSStatus } = useParcours();
  const amoMode = useAmoMode();

  const items = getStepListItems(amoMode, statutAmo, currentStep, lastDSStatus === DSStatus.ACCEPTE);

  return (
    <div className="fr-card">
      <div className="fr-card__body">
        <h2 className="fr-card__title">Ma liste</h2>
        <div className="fr-card__desc">
          <ol type="1" className="fr-list space-y-2">
            {items.map((item) => (
              <li key={item.key}>{renderItemLink(item, getDossierUrl)}</li>
            ))}
          </ol>
        </div>
      </div>
    </div>
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
