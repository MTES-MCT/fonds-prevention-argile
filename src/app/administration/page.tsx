import { getServerEnv } from "@/shared/config/env.config";
import { notFound } from "next/navigation";
import { graphqlClient } from "@/features/parcours/dossiers-ds/adapters";
import {
  getDemarcheDetails,
  getDossiers,
} from "@/features/parcours/dossiers-ds/actions";
import AdminDashboard from "./components/AdminDashboard";

export default async function AdminPage() {
  const env = getServerEnv();
  const demarcheId = parseInt(env.DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE);

  // Récupération des données en parallèle
  const [schema, demarcheResponse, dossiersResponse] = await Promise.all([
    graphqlClient.getDemarcheSchema(demarcheId),
    getDemarcheDetails(demarcheId),
    getDossiers(demarcheId, { first: 20 }),
  ]);

  if (!demarcheResponse.success) {
    notFound();
  }

  return (
    <AdminDashboard
      demarche={demarcheResponse.data}
      dossiersConnection={
        dossiersResponse.success ? dossiersResponse.data : null
      }
      schema={schema}
    />
  );
}
