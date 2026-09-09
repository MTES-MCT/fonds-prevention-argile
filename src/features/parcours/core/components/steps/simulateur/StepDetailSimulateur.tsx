import Link from "next/link";
import { useParcours } from "../../../context/useParcours";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { estLogementNonEligible } from "@/features/parcours/amo/domain/value-objects";
import { evaluateSimulation } from "@/features/simulateur/domain/services/eligibilite-archivage.service";

/**
 * Première carte du parcours : la simulation d'éligibilité, toujours franchie
 * (sans elle il n'y a pas de dossier) et désormais consultable et corrigeable.
 */
export default function StepDetailSimulateur() {
  const { parcours, statutAmo, isQualifiedNonEligible } = useParcours();

  // Le verdict enregistré prime : c'est lui qui a archivé (ou non) le dossier.
  const isNonEligible =
    estLogementNonEligible(statutAmo, isQualifiedNonEligible) ||
    evaluateSimulation(parcours?.rgaSimulationData).isNonEligible;

  const simuleeLe = parcours?.rgaSimulationCompletedAt;

  return (
    <div className="fr-card">
      <div className="fr-card__body fr-py-4w">
        {isNonEligible ? (
          <span className="fr-badge fr-text--sm fr-badge--error fr-mb-2w">Non éligible</span>
        ) : (
          <span className="fr-badge fr-text--sm fr-badge--success fr-mb-2w">
            {simuleeLe ? `Validé le ${simuleeLe.toLocaleDateString("fr-FR")}` : "Validé"}
          </span>
        )}

        <h5 className="text-left fr-text-label--blue-france">1. Simulateur d&apos;éligibilité</h5>

        <p className="fr-text--sm">{isNonEligible ? "Vous n’êtes pas éligible." : "Vous êtes éligible."}</p>

        <Link
          href={ROUTES.particulier.maSimulation}
          className="fr-link fr-icon-arrow-right-line fr-link--icon-right"
          style={{ display: "inline-flex", alignItems: "center", width: "fit-content" }}>
          Voir et modifier les données
        </Link>
      </div>
    </div>
  );
}
