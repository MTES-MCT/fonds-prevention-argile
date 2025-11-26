import AdminDashboard from "./components/AdminDashboard";
import { Step } from "@/features/parcours/core";
import { getDemarcheDetails, getDemarcheSchema, getDossiers } from "@/features/parcours/dossiers-ds/actions";
import { Suspense } from "react";
import Loading from "../loading";

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

export default function AdminPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminDataLoader />
    </Suspense>
  );
}
