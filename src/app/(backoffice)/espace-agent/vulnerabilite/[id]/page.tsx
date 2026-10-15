import { notFound } from "next/navigation";
import Link from "next/link";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { exigerAccesEspaceAgent } from "@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service";
import { resoudreDossierTestVulnerabilite } from "@/features/backoffice/espace-agent/shared/services/test-vulnerabilite-agent.service";
import { resolveEspaceAgentPath } from "@/features/backoffice/espace-agent/dossiers/services/admin-url-resolver.service";
import { isVulnerabiliteRgaActive } from "@/features/vulnerabilite-rga/domain/value-objects/vulnerabilite-disponibilite";
import { TestVulnerabiliteAgent } from "../../shared/components/TestVulnerabiliteAgent";

export const metadata = {
  title: "Test de vulnérabilité | Fonds Prévention Argile",
  robots: "noindex, nofollow",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Test de vulnérabilité fait par l'agent avec le demandeur au téléphone.
 * Atteint depuis les pages dossier, demande et prospect, avec le même identifiant que l'édition de simulation.
 */
export default async function TestVulnerabilitePage({ params }: PageProps) {
  await exigerAccesEspaceAgent();

  // Hors production, la feature n'existe pas : 404, comme `/vulnerabilite-rga`.
  if (!isVulnerabiliteRgaActive()) notFound();

  const { id } = await params;

  const dossier = await resoudreDossierTestVulnerabilite(id);
  if (!dossier.success) notFound();

  const urlRetour = (await resolveEspaceAgentPath(dossier.data.parcoursId)) ?? ROUTES.backoffice.espaceAgent.root;

  return (
    <>
      <div className="fr-notice fr-notice--info">
        <div className="fr-container">
          <div className="fr-notice__body">
            <p>
              <span className="fr-notice__title">Test fait avec le demandeur</span>
              <span className="fr-notice__desc">
                Vous répondez pour le compte de {dossier.data.nomDemandeur}. Le résultat sera rattaché à son dossier et
                visible dans son espace.
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="fr-container fr-py-1w">
        <nav role="navigation" className="fr-breadcrumb" aria-label="vous êtes ici :">
          <button className="fr-breadcrumb__button" aria-expanded="false" aria-controls="breadcrumb-test-vulnerabilite">
            Voir le fil d&apos;Ariane
          </button>
          <div className="fr-collapse" id="breadcrumb-test-vulnerabilite">
            <ol className="fr-breadcrumb__list">
              <li>
                <Link className="fr-breadcrumb__link" href={ROUTES.backoffice.espaceAgent.root}>
                  Accueil
                </Link>
              </li>
              <li>
                <Link className="fr-breadcrumb__link" href={urlRetour}>
                  {dossier.data.nomDemandeur}
                </Link>
              </li>
              <li>
                <a className="fr-breadcrumb__link" aria-current="page">
                  Test de vulnérabilité
                </a>
              </li>
            </ol>
          </div>
        </nav>

        <TestVulnerabiliteAgent
          id={id}
          nomDemandeur={dossier.data.nomDemandeur}
          adresseInitiale={dossier.data.adresse}
          urlRetour={urlRetour}
        />
      </div>
    </>
  );
}
