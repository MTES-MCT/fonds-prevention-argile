import content from "../(home)/content/content.json";
import { Notice } from "@/shared/components";
import { SimulateurFormulaire } from "@/features/simulateur";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { aDejaUneSimulation } from "@/features/parcours/core/services/ma-simulation.service";

export default async function SimulateurPage() {
  // Une simulation par compte : le demandeur qui en a déjà une la corrige au lieu
  // d'en créer une seconde. Sans cette garde, les 14 CTA vers /simulateur seraient
  // autant de portes d'entrée pour écraser silencieusement son dossier.
  if (await aDejaUneSimulation()) {
    redirect(ROUTES.particulier.maSimulation);
  }

  return (
    <>
      <Notice
        className="fr-notice--info"
        description={`${content.notice.description}`}
        title={content.notice.title}
        more={content.notice.more}
        more_link={content.notice.more_link}
        buttonClose={true}
      />
      <div className="fr-container">
        {/* Breadcrumb */}
        <nav role="navigation" className="fr-breadcrumb" aria-label="vous êtes ici :">
          <button className="fr-breadcrumb__button" aria-expanded="false" aria-controls="breadcrumb-rga">
            Voir le fil d'Ariane
          </button>
          <div className="fr-collapse" id="breadcrumb-rga">
            <ol className="fr-breadcrumb__list">
              <li>
                <Link className="fr-breadcrumb__link" href="/">
                  Accueil
                </Link>
              </li>
              <li>
                <span className="fr-breadcrumb__link" aria-current="page">
                  Simulateur d'éligibilité
                </span>
              </li>
            </ol>
          </div>
        </nav>
        <SimulateurFormulaire />
      </div>
    </>
  );
}
