import Link from "next/link";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";

interface CalloutSimulationAEffectuerProps {
  parcoursId: string;
  /**
   * Indique si le demandeur s'est connecté via FranceConnect.
   * Affecte le wording du message : si le demandeur n'a pas encore de compte,
   * l'agent est invité à remplir la simulation à sa place.
   */
  hasUserClaimed: boolean;
}

export function CalloutSimulationAEffectuer({ parcoursId, hasUserClaimed }: CalloutSimulationAEffectuerProps) {
  return (
    <div className="fr-callout fr-callout--yellow-moutarde fr-mb-4w">
      <h3 className="fr-callout__title">La simulation d&apos;éligibilité doit être effectuée.</h3>
      <p className="fr-callout__text">
        {hasUserClaimed
          ? "Le demandeur peut s'en charger lui-même, mais vous pouvez également la remplir pour lui si vous disposez des informations requises."
          : "Le demandeur peut s'en charger lui-même, mais vous pouvez également la remplir pour lui si vous disposez des informations requises (un email de notification lui sera envoyé pour l'informer)."}
      </p>
      <Link
        className="fr-btn"
        href={ROUTES.backoffice.espaceAgent.editionDonneesSimulation(parcoursId)}>
        Faire la simulation d&apos;éligibilité
      </Link>
    </div>
  );
}
