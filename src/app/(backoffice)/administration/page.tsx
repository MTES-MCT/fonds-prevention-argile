import { checkAdminAccess, ROUTES } from "@/features/auth";
import { AccesNonAutoriseAdmin } from "@/shared/components";
import { Step } from "@/features/parcours/core";
import { getDemarcheDetails, getDemarcheSchema, getDossiers } from "@/features/parcours/dossiers-ds/actions";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Loading from "../../(main)/loading";
import AdminDashboard from "./components/AdminDashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

export default async function AdminPage() {
  // Vérifier que l'utilisateur est admin
  const access = await checkAdminAccess();

  // Si pas connecté du tout : redirect vers connexion agent
  if (!access.hasAccess && access.errorCode === "NOT_AUTHENTICATED") {
    redirect(ROUTES.connexion.agent);
  }

  // Si connecté mais pas admin : afficher erreur 403
  if (!access.hasAccess) {
    return <AccesNonAutoriseAdmin />;
  }

  // Utilisateur admin valide : afficher le dashboard
  return (
    <Suspense fallback={<Loading />}>
      <AdminDataLoader />
    </Suspense>
  );
}
