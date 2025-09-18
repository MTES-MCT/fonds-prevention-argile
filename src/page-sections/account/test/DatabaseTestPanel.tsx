import { useState, useEffect } from "react";

export default function DatabaseTestPanel() {
  const [dbQueries, setDbQueries] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Charger automatiquement au montage si en dev
    if (process.env.NODE_ENV === "development") {
      checkDatabase();
    }
  }, []);

  const checkDatabase = async () => {
    setIsLoading(true);
    try {
      // Vous devrez créer une route API pour ces requêtes
      // Pour l'instant, voici ce qu'il faudrait vérifier
      const queries = {
        userQuery: `SELECT id, fc_id, last_login, created_at FROM users ORDER BY created_at DESC LIMIT 1`,
        parcoursQuery: `SELECT * FROM parcours_prevention WHERE user_id = '[userId]'`,
        dossiersQuery: `SELECT * FROM dossiers_demarches_simplifiees WHERE parcours_id = '[parcoursId]'`,
        userCount: `SELECT COUNT(*) as count FROM users`,
        parcoursCount: `SELECT COUNT(*) as count FROM parcours_prevention`,
      };

      console.log("Requêtes SQL à exécuter :", queries);
      setDbQueries(queries);

      // TODO: Appeler votre API pour exécuter ces requêtes
      // const res = await fetch('/api/debug/database');
      // const data = await res.json();
      // setDbQueries(data);
    } catch (error) {
      console.error("Erreur DB check:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyQuery = (query: string) => {
    navigator.clipboard.writeText(query);
    alert("Requête copiée !");
  };

  return (
    <div className="fr-callout fr-callout--purple-glycine fr-mb-4w">
      <h3 className="fr-callout__title">🗄️ Requêtes DB utiles</h3>

      <div className="fr-text--sm">
        <p className="fr-mb-2w">
          Copiez ces requêtes pour vérifier l'état de votre base de données :
        </p>

        {Object.entries(dbQueries).map(([key, query]) => (
          <div key={key} className="fr-mb-2w">
            <div className="fr-grid-row fr-grid-row--middle">
              <div className="fr-col">
                <code
                  className="fr-text--xs"
                  style={{
                    backgroundColor: "#f4f4f4",
                    padding: "0.5rem",
                    borderRadius: "4px",
                    display: "block",
                    overflow: "auto",
                  }}
                >
                  {query as string}
                </code>
              </div>
              <div className="fr-col-auto fr-ml-1w">
                <button
                  className="fr-btn fr-btn--tertiary fr-btn--sm"
                  onClick={() => copyQuery(query as string)}
                  title="Copier"
                >
                  📋
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="fr-alert fr-alert--info fr-alert--sm fr-mt-2w">
          <p className="fr-text--xs">
            💡 Utilisez ces requêtes dans votre client PostgreSQL pour vérifier
            :
          </p>
          <ul className="fr-text--xs">
            <li>L'utilisateur a bien été créé après connexion FC</li>
            <li>Le parcours est lié au bon user_id</li>
            <li>Les dossiers DS sont correctement enregistrés</li>
            <li>Pas de duplication lors de la reconnexion</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
