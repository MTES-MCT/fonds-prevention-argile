import { useParcours } from "@/lib/parcours/hooks/useParcours";
import { Status, Step } from "@/lib/parcours/parcours.types";
import Link from "next/link";

export default function StepDetailAmo() {
  const { currentStep, currentStatus } = useParcours();
  const isActive = currentStep === Step.CHOIX_AMO;
  const isTodo = isActive && currentStatus === Status.TODO;

  return (
    <div className="fr-card">
      <div className="fr-card__body fr-py-4w">
        {/* Badge conditionnel */}
        {isTodo ? (
          <span className="fr-badge fr-text--sm fr-badge--new fr-mb-4w">
            À Faire
          </span>
        ) : (
          <span className="fr-badge fr-text--sm fr-mb-4w">À venir</span>
        )}

        {/* Titre avec couleur conditionnelle */}
        <h5
          className={
            isActive
              ? "text-left fr-text-label--blue-france"
              : "text-left fr-text--disabled"
          }
          style={!isActive ? { color: "var(--text-disabled-grey)" } : undefined}
        >
          1. Choisir mon AMO
        </h5>

        {/* Description avec couleur conditionnelle */}
        <p
          className={!isActive ? "fr-text--disabled" : undefined}
          style={!isActive ? { color: "var(--text-mention-grey)" } : undefined}
        >
          Choisissez votre AMO parmi les choix dans le tableau ci-dessus.
        </p>

        {/* Lien selon l'état */}
        {isActive && (
          <Link
            href="#choix-amo"
            target="_self"
            className="fr-link fr-icon-arrow-up-fill fr-link--icon-right"
            style={{
              display: "inline-flex !important",
              alignItems: "center",
              width: "fit-content",
            }}
          >
            Choisir mon AMO
          </Link>
        )}
      </div>
    </div>
  );
}
