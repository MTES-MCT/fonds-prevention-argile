import { getServerEnv } from "@/shared/config/env.config";
import { graphqlClient } from "@/features/parcours/dossiers-ds/adapters";
import {
  getDemarcheDetails,
  getDossiers,
} from "@/features/parcours/dossiers-ds/actions";
import AdminDashboard from "./components/AdminDashboard";

export default async function AdminPage() {
  const env = getServerEnv();
  const demarcheId = parseInt(env.DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE);

  try {
    // Récupération des données en parallèle
    const [schema, demarcheResponse, dossiersResponse] = await Promise.all([
      graphqlClient.getDemarcheSchema(demarcheId).catch(() => null),
      getDemarcheDetails(demarcheId),
      getDossiers(demarcheId, { first: 20 }),
    ]);

    // Si la démarche n'est pas accessible, afficher un message d'erreur
    if (!demarcheResponse.success) {
      return (
        <div className="fr-container fr-py-8w">
          <div className="fr-alert fr-alert--error">
            <h3 className="fr-alert__title">Erreur d'accès</h3>
            <p>
              Impossible d'accéder à la démarche {demarcheId}. Vérifiez que
              votre token API a les permissions nécessaires.
            </p>
            <p className="fr-text--sm fr-mt-2w">
              Erreur : {demarcheResponse.error}
            </p>
          </div>
        </div>
      );
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
  } catch (error) {
    console.error("Error loading admin page:", error);
    return (
      <div className="fr-container fr-py-8w">
        <div className="fr-alert fr-alert--error">
          <h3 className="fr-alert__title">Erreur technique</h3>
          <p>
            Une erreur s'est produite lors du chargement de la page
            d'administration.
          </p>
        </div>
      </div>
    );
  }
}
