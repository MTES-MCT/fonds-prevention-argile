import Link from "next/link";
import { getCurrentAgent } from "@/features/backoffice/shared/actions/agent.actions";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import type { UserRole } from "@/shared/domain/value-objects/user-role.enum";
import { isVulnerabiliteRgaActive } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite";
import type { InfoVulnerabiliteData } from "@/features/backoffice/espace-agent/shared/services/build-info-vulnerabilite.service";
import { peutFaireTestVulnerabilitePourDemandeur } from "@/features/backoffice/espace-agent/shared/services/test-vulnerabilite-agent.service";
import { InfoVulnerabilite } from "./InfoVulnerabilite";

interface VulnerabiliteDossierProps {
  /** Identifiant de la page d'origine (validation AMO, ou parcours d'un prospect). */
  id: string;
  vulnerabilite: InfoVulnerabiliteData | null;
}

/**
 * Carte « Vulnérabilité au RGA » d'un dossier, avec de quoi faire le test à la place du demandeur.
 * Sans test rattaché, la carte n'existe que pour qui peut le faire.
 */
export async function VulnerabiliteDossier({ id, vulnerabilite }: VulnerabiliteDossierProps) {
  const agent = await getCurrentAgent();
  // Feature hors production tant que la grille n'est pas validée (ADR-0030).
  const peutFaireLeTest =
    isVulnerabiliteRgaActive() && agent.success && peutFaireTestVulnerabilitePourDemandeur(agent.data.role as UserRole);

  if (!vulnerabilite && !peutFaireLeTest) return null;

  const lancerLeTest = peutFaireLeTest && (
    <Link href={ROUTES.backoffice.espaceAgent.testVulnerabilite(id)} className="fr-btn fr-btn--secondary fr-btn--sm">
      {vulnerabilite ? "Refaire le test avec le demandeur" : "Faire le test avec le demandeur"}
    </Link>
  );

  return (
    <div className="fr-mb-4w">
      {vulnerabilite ? (
        <InfoVulnerabilite data={vulnerabilite} action={lancerLeTest} />
      ) : (
        <div className="bg-(--background-default-grey) border border-solid border-(--border-default-grey) p-6">
          <h3 className="fr-h5 fr-mb-1w">
            <span className="fr-icon-alert-line fr-mr-2v" aria-hidden="true"></span>
            Vulnérabilité au RGA
          </h3>
          <p className="fr-text--sm fr-mb-0">
            Le demandeur n&apos;a pas encore fait le test de vulnérabilité. Vous pouvez le faire avec lui au téléphone
            (environ 5 minutes) : le résultat sera rattaché à son dossier.
          </p>
          {lancerLeTest && <div className="fr-mt-3w">{lancerLeTest}</div>}
        </div>
      )}
    </div>
  );
}
