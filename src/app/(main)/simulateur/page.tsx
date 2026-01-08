import ForbiddenSimulator from "./components/ForbiddenSimulator";
import content from "../(home)/content/content.json";
import { AUTH_METHODS, getCurrentUser } from "@/features/auth";
import { Notice } from "@/shared/components";
import { DEPARTEMENTS_ELIGIBLES_RGA } from "@/features/seo/domain/config/seo.config";
import { SimulateurFormulaire } from "@/features/simulateur";
import Link from "next/link";

export default async function SimulateurPage() {
  const user = await getCurrentUser();

  // Si connecté avec FranceConnect, bloquer
  if (user && user.authMethod === AUTH_METHODS.FRANCECONNECT) {
    return (
      <div className="fr-container fr-py-8w">
        <ForbiddenSimulator />
      </div>
    );
  }

  // Sinon, afficher le simulateur
  return (
    <>
      <Notice
        className="fr-notice--info"
        description={`${content.notice.description} ${DEPARTEMENTS_ELIGIBLES_RGA.join(" • ")}`}
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
