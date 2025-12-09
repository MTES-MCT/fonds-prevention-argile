import { checkAgentAccess, ROUTES } from "@/features/auth";
import { checkTabAccess } from "@/features/auth/permissions/services/permissions.service";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import { Step } from "@/features/parcours/core";
import { getDemarcheDetails, getDemarcheSchema, getDossiers } from "@/features/parcours/dossiers-ds/actions";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Loading from "../../(main)/loading";
import AdminDashboard from "./components/AdminDashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface AdminPageProps {
  searchParams: Promise<{ tab?: string }>;
}

async function AdminDataLoader() {
  // Charger les données de toutes les démarches en parallèle
  const [eligibiliteResults] = await Promise.all([
    Promise.all([
      getDemarcheDetails(Step.ELIGIBILITE),
      getDemarcheSchema(Step.ELIGIBILITE),
      getDossiers(Step.ELIGIBILITE),
    ]),
  ]);

  return (
    <AdminDashboard
      eligibiliteData={{
        demarche: eligibiliteResults[0],
        schema: eligibiliteResults[1],
        dossiers: eligibiliteResults[2],
      }}
    />
  );
}

/**
 * Page d'administration - Réservée aux agents
 *
 * Accessible par les rôles :
 * - ADMINISTRATEUR
 * - SUPER_ADMINISTRATEUR
 * - ANALYSTE (avec restrictions sur certains onglets)
 */
export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const currentTab = params.tab || "statistiques";

  // Vérifier que l'utilisateur est un agent
  const access = await checkAgentAccess();

  // Si pas connecté du tout redirect vers connexion agent
  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.agent);
  }

  // Si connecté mais pas agent : afficher erreur 403
  if (!access.hasAccess) {
    return <AccesNonAutoriseAdmin />;
  }

  // Vérifier l'accès à l'onglet spécifique
  const tabAccess = await checkTabAccess(currentTab);

  // Si pas d'accès à cet onglet : redirect vers page statistiques
  if (!tabAccess.hasAccess) {
    redirect("/administration?tab=statistiques");
  }

  // Utilisateur autorisé : afficher le dashboard avec le menu latéral
  return (
    <Suspense fallback={<Loading />}>
      <AdminDataLoader />
    </Suspense>
  );
}
