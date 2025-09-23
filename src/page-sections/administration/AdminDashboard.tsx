import type {
  DemarcheDetailed,
  DossiersConnection,
} from "@/lib/api/demarches-simplifiees/graphql/types";
import DemarcheInfo from "./DemarcheInfo";
import DemarcheSchema from "./DemarcheSchema";
import DossiersList from "./DossiersList";

interface AdminDashboardProps {
  demarche: DemarcheDetailed;
  dossiersConnection: DossiersConnection | null;
  schema: DemarcheDetailed | null;
}

export default function AdminDashboard({
  demarche,
  dossiersConnection,
  schema,
}: AdminDashboardProps) {
  return (
    <div className="fr-container fr-py-6w">
      <h1 className="fr-h2 fr-mb-4w">
        Administration - Démarche d'éligibilité
      </h1>

      {/* Informations générales */}
      <DemarcheInfo demarche={demarche} />

      {/* Schéma de la démarche */}
      <DemarcheSchema
        champDescriptors={schema?.activeRevision?.champDescriptors}
      />

      {/* Liste et gestion des dossiers */}
      <div className="fr-mb-6w">
        <h2 className="fr-h3 fr-mb-3w">Gestion des dossiers</h2>
        <DossiersList
          dossiersConnection={dossiersConnection}
          demarcheId={demarche.number}
        />
      </div>
    </div>
  );
}
