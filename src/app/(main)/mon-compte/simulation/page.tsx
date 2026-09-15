import { redirect } from "next/navigation";
import Link from "next/link";
import { checkParticulierAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseParticulier } from "@/shared/components";
import { getMaSimulation } from "@/features/parcours/core/services/ma-simulation.service";
import { SimulateurEditionDemandeur } from "@/features/parcours/core/components/SimulateurEditionDemandeur";
import { SimulationRecap } from "@/features/simulateur/components/shared/SimulationRecap";
import { MESSAGES_LECTURE_SEULE } from "@/features/parcours/core/domain/value-objects/edition-simulation";

export const metadata = {
  title: "Mes données de simulation | Fonds Prévention Argile",
  description: "Consulter et modifier les données de votre simulation d'éligibilité",
};

/**
 * Consultation et modification, par le demandeur, de sa propre simulation.
 * Même écran que l'édition agent (`SimulateurEdition`), sauf quand la simulation
 * est verrouillée : le récapitulatif remplace alors le formulaire.
 */
export default async function MaSimulationPage() {
  const access = await checkParticulierAccess();

  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.particulier);
  }
  if (!access.hasAccess) {
    return <AccesNonAutoriseParticulier />;
  }

  // Sans simulation, il n'y a rien à éditer : le simulateur public reste ouvert.
  const maSimulation = await getMaSimulation();
  if (!maSimulation) {
    redirect(ROUTES.simulateur);
  }

  return (
    <div className="fr-container fr-py-1w">
      <nav role="navigation" className="fr-breadcrumb" aria-label="vous êtes ici :">
        <button className="fr-breadcrumb__button" aria-expanded="false" aria-controls="breadcrumb-ma-simulation">
          Voir le fil d&apos;Ariane
        </button>
        <div className="fr-collapse" id="breadcrumb-ma-simulation">
          <ol className="fr-breadcrumb__list">
            <li>
              <Link className="fr-breadcrumb__link" href={ROUTES.particulier.monCompte}>
                Mon compte
              </Link>
            </li>
            <li>
              <a className="fr-breadcrumb__link" aria-current="page">
                Mes données de simulation
              </a>
            </li>
          </ol>
        </div>
      </nav>

      {maSimulation.lectureSeule ? (
        <div className="fr-grid-row fr-grid-row--center fr-pb-8w">
          <div className="fr-col-12 fr-col-md-8">
            <h1 className="fr-h3">Mes données de simulation d&apos;éligibilité</h1>
            <div className="fr-alert fr-alert--info fr-mb-3w">
              <p>{MESSAGES_LECTURE_SEULE[maSimulation.lectureSeule]}</p>
            </div>
            <SimulationRecap simulation={maSimulation.rgaData} />
            <Link
              href={ROUTES.particulier.monCompte}
              className="fr-btn fr-btn--secondary fr-mt-3w fr-icon-arrow-left-line fr-btn--icon-left">
              Retour à mon compte
            </Link>
          </div>
        </div>
      ) : (
        <SimulateurEditionDemandeur nomComplet={maSimulation.nomComplet} initialData={maSimulation.rgaData} />
      )}
    </div>
  );
}
