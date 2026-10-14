import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { checkParticulierAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseParticulier } from "@/shared/components";
import { getAdresseMaSimulation, getMaVulnerabilite } from "@/features/parcours/core/services/ma-vulnerabilite.service";
import {
  ContenuResultatVulnerabilite,
  LancerTestVulnerabiliteButton,
} from "@/features/vulnerabilite-rga/components/results";
import { remplitCriteresEligibiliteFondsDepuis } from "@/features/vulnerabilite-rga/domain/services/eligibilite-fonds.service";
import { VULNERABILITE_RGA_URL } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-routes";
import { isVulnerabiliteRgaActive } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite";

export const metadata = {
  title: "Mon test de vulnérabilité | Fonds Prévention Argile",
  robots: "noindex, nofollow",
};

// Derrière une session : jamais prérendue.
export const dynamic = "force-dynamic";

/**
 * Résultat du dernier test de vulnérabilité du demandeur, en lecture seule. Relu depuis la base
 * (ADR-0032), pas depuis le navigateur : il se consulte aussi après une reconnexion.
 */
export default async function MaVulnerabilitePage() {
  if (!isVulnerabiliteRgaActive()) notFound();

  const access = await checkParticulierAccess();
  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.particulier);
  }
  if (!access.hasAccess) {
    return <AccesNonAutoriseParticulier />;
  }

  const [vulnerabilite, adresse] = await Promise.all([getMaVulnerabilite(), getAdresseMaSimulation()]);
  // Sans test rattaché au compte, il n'y a rien à consulter : le simulateur reste ouvert.
  if (!vulnerabilite) {
    redirect(VULNERABILITE_RGA_URL);
  }

  return (
    <div className="fr-container fr-py-1w">
      <nav role="navigation" className="fr-breadcrumb" aria-label="vous êtes ici :">
        <button className="fr-breadcrumb__button" aria-expanded="false" aria-controls="breadcrumb-ma-vulnerabilite">
          Voir le fil d&apos;Ariane
        </button>
        <div className="fr-collapse" id="breadcrumb-ma-vulnerabilite">
          <ol className="fr-breadcrumb__list">
            <li>
              <Link className="fr-breadcrumb__link" href={ROUTES.particulier.monCompte}>
                Mon compte
              </Link>
            </li>
            <li>
              <a className="fr-breadcrumb__link" aria-current="page">
                Mon test de vulnérabilité
              </a>
            </li>
          </ol>
        </div>
      </nav>

      <ContenuResultatVulnerabilite
        aleaRga={vulnerabilite.aleaRga}
        points={vulnerabilite.points}
        eligibleFonds={remplitCriteresEligibiliteFondsDepuis({
          codeDepartement: vulnerabilite.codeDepartement,
          aleaRga: vulnerabilite.aleaRga,
          mitoyennete: vulnerabilite.mitoyennete,
        })}
        actions={
          <>
            <LancerTestVulnerabiliteButton
              adresse={adresse}
              recommencer
              className="fr-btn fr-btn--secondary !w-full md:!w-auto justify-center fr-mb-2w md:fr-mb-0 md:fr-mr-2w">
              Refaire le test
            </LancerTestVulnerabiliteButton>
            <Link href={ROUTES.particulier.monCompte} className="fr-btn !w-full md:!w-auto justify-center">
              Retour à mon compte
            </Link>
          </>
        }
      />
    </div>
  );
}
