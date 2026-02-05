import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getProspectDetail } from "@/features/backoffice/espace-agent/prospects/services/prospect-detail.service";
import { ROUTES } from "@/features/auth/domain/value-objects/configs/routes.config";
import { formatNomComplet, formatDateShort } from "@/shared/utils";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { STEP_LABELS_NUMBERED } from "@/shared/domain/value-objects/step.enum";
import {
  InfoDemandeur,
  InfoLogement,
  LocalisationLogement,
  ParcoursDemandeur,
  GagnezDuTemps,
  AFaire,
} from "../../shared";
import type { ProspectAmoInfo } from "@/features/backoffice/espace-agent/prospects/domain/types";
import { ContactCard } from "@/shared/components/ContactCard/ContactCard";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Force Next.js à ne pas cacher cette page (mode dynamique)
export const dynamic = "force-dynamic";

/**
 * Page détail d'un prospect (Espace Allers-Vers)
 */
export default async function ProspectDetailPage({ params }: PageProps) {
  // Vérifier l'authentification
  const user = await getCurrentUser();
  if (!user) {
    redirect(ROUTES.connexion.agent);
  }

  const { id } = await params;

  // Récupérer les données du prospect
  const result = await getProspectDetail(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const prospect = result.data;
  const nomComplet = formatNomComplet(prospect.particulier.prenom, prospect.particulier.nom);

  // Construire les objets pour les composants partagés
  const demandeur = {
    prenom: prospect.particulier.prenom,
    nom: prospect.particulier.nom,
    email: prospect.particulier.email,
    telephone: prospect.particulier.telephone,
    adresse: prospect.logement.adresse,
  };

  return (
    <>
      <div className="fr-container fr-py-4w">
        {/* Fil d'Ariane */}
        <nav role="navigation" className="fr-breadcrumb" aria-label="vous êtes ici :">
          <button className="fr-breadcrumb__button" aria-expanded="false" aria-controls="breadcrumb-1">
            Voir le fil d&apos;Ariane
          </button>
          <div className="fr-collapse" id="breadcrumb-1">
            <ol className="fr-breadcrumb__list">
              <li>
                <Link className="fr-breadcrumb__link" href={ROUTES.backoffice.espaceAgent.root}>
                  Accueil
                </Link>
              </li>
              <li>
                <Link className="fr-breadcrumb__link" href={ROUTES.backoffice.espaceAgent.prospects}>
                  Nouveau prospect
                </Link>
              </li>
              <li>
                <a className="fr-breadcrumb__link" aria-current="page">
                  {nomComplet}
                </a>
              </li>
            </ol>
          </div>
        </nav>

        {/* Titre de la page */}
        <div className="fr-mb-4w">
          <h1 className="fr-h2 fr-mb-2w">{nomComplet}</h1>
          <div className="fr-badges-group">
            <p className="fr-badge fr-badge--new">
              Nouveau prospect du {formatDateShort(prospect.createdAt.toISOString())}
            </p>
            <p className="fr-badge">{STEP_LABELS_NUMBERED[prospect.currentStep] || prospect.currentStep}</p>
          </div>
        </div>

        {/* Section informations */}
        <div className="fr-grid-row fr-grid-row--gutters">
          <div className="fr-col-12 fr-col-md-8">
            <CalloutInfosProspect amoInfo={prospect.amoInfo} />
          </div>
          <div className="fr-col-12 fr-col-md-4">
            <InfoDemandeur demandeur={demandeur} />
          </div>
        </div>
      </div>

      {/* Panneau principal avec fond bleu */}
      <section className="fr-background-alt--blue-france fr-py-4w">
        <div className="fr-container">
          <div className="fr-grid-row fr-grid-row--gutters">
            {/* Colonne gauche */}
            <div className="fr-col-12 fr-col-md-8">
              <div className="fr-mb-4w">
                <InfoLogement logement={prospect.infoLogement} />
              </div>
              <div className="fr-mb-4w">
                <LocalisationLogement logement={prospect.infoLogement} adresse={prospect.logement.adresse} />
              </div>
              <div>
                <GagnezDuTemps />
              </div>
            </div>

            {/* Colonne droite */}
            <div className="fr-col-12 fr-col-md-4">
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2rem",
                }}>
                <ParcoursDemandeur
                  currentStep={prospect.currentStep}
                  dates={{
                    compteCreatedAt: prospect.createdAt,
                  }}
                  lastUpdatedAt={prospect.updatedAt}
                />
                <AFaire
                  items={[
                    "Contacter le demandeur",
                    "L'informer et répondre à ses questions",
                    "L'inciter à contacter et choisir un AMO",
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * Génération des métadonnées de la page
 */
export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const result = await getProspectDetail(id);

  if (!result.success || !result.data) {
    return {
      title: "Prospect non trouvé",
    };
  }

  const nomComplet = formatNomComplet(result.data.particulier.prenom, result.data.particulier.nom);

  return {
    title: `Prospect ${nomComplet} | Espace Agent`,
    description: `Détails du prospect ${nomComplet}`,
  };
}

/**
 * Callout dynamique affichant le statut AMO du prospect
 */
function CalloutInfosProspect({ amoInfo }: { amoInfo: ProspectAmoInfo }) {
  switch (amoInfo.status) {
    case "aucun_amo_disponible":
      return (
        <div className="fr-callout fr-callout--blue-cumulus">
          <h3 className="fr-callout__title">Aucun AMO disponible</h3>
          <p className="fr-callout__text">
            À ce jour, aucun Assistant à Maîtrise d&apos;Ouvrage n&apos;est disponible dans votre département.
            N&apos;hésitez pas à contacter les demandeurs pour les informer et les faire patienter.
          </p>
        </div>
      );

    case "amo_disponibles":
      return (
        <div className="fr-callout fr-callout--yellow-moutarde">
          <h3 className="fr-callout__title">Le demandeur doit contacter un AMO</h3>
          <p className="fr-callout__text">
            Le recours à un AMO (Assistant à Maîtrise d&apos;Ouvrage) est obligatoire pour bénéficier du Fonds
            Prévention Argile. Accompagnez le demandeur afin qu&apos;il contacte et confirme la structure choisie dans
            les propositions ci-dessous afin de passer à l&apos;étape suivante.
          </p>
          <h4 className="fr-h6 fr-mt-3w fr-mb-2w">Liste des AMO locaux certifiés pour le demandeur</h4>
          <div className="fr-grid-row fr-grid-row--gutters">
            {amoInfo.amosDisponibles.map((amo) => (
              <ContactCard key={amo.id} id={amo.id} nom={amo.nom} emails={amo.emails} telephone={amo.telephone} adresse={amo.adresse} selectable={false} />
            ))}
          </div>
        </div>
      );
  }
}
