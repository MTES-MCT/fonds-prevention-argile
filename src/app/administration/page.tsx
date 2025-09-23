import { notFound } from "next/navigation";
import { getServerEnv } from "@/lib/config/env.config";
import {
  getDemarcheDetails,
  getDossiers,
} from "@/lib/actions/demarches-simplifies";
import { getDemarchesSimplifieesClient } from "@/lib/api/demarches-simplifiees/graphql";
import AdminDashboard from "@/page-sections/administration/AdminDashboard";

export default async function AdminPage() {
  const env = getServerEnv();
  const demarcheId = parseInt(env.DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE);

  // Récupération des données en parallèle
  const client = getDemarchesSimplifieesClient();
  const [schema, demarcheResponse, dossiersResponse] = await Promise.all([
    client.getDemarcheSchema(demarcheId),
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
