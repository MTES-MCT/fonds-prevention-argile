import { useState } from "react";
import {
  getDemarcheDetails,
  getDossiers,
  getDossierByNumber,
  getDemarcheStatistics,
  getPrefilledDossiers,
} from "@/lib/actions/demarches-simplifies";
import {
  GraphQLTestResult,
  isStatistics,
  isDossiersConnection,
} from "@/lib/types/tests/tests-result";

export default function TestDsGraphqlPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GraphQLTestResult>(null);
  const [error, setError] = useState<string | null>(null);
  const [demarcheNumber, setDemarcheNumber] = useState("");
  const [dossierNumber, setDossierNumber] = useState("");

  const handleGetDemarcheDetails = async () => {
    if (!demarcheNumber) {
      setError("Veuillez entrer un numéro de démarche");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await getDemarcheDetails(parseInt(demarcheNumber));
      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.error);
      }
    } catch {
      setError("Erreur inattendue lors de la récupération de la démarche");
    } finally {
      setLoading(false);
    }
  };

  const handleGetDossiers = async () => {
    if (!demarcheNumber) {
      setError("Veuillez entrer un numéro de démarche");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await getDossiers(parseInt(demarcheNumber), {
        first: 100,
      });
      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.error);
      }
    } catch {
      setError("Erreur inattendue lors de la récupération des dossiers");
    } finally {
      setLoading(false);
    }
  };

  const handleGetDossierByNumber = async () => {
    if (!dossierNumber) {
      setError("Veuillez entrer un numéro de dossier");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await getDossierByNumber(parseInt(dossierNumber));
      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.error);
      }
    } catch {
      setError("Erreur inattendue lors de la récupération du dossier");
    } finally {
      setLoading(false);
    }
  };

  const handleGetStatistics = async () => {
    if (!demarcheNumber) {
      setError("Veuillez entrer un numéro de démarche");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await getDemarcheStatistics(parseInt(demarcheNumber));
      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.error);
      }
    } catch {
      setError("Erreur inattendue lors de la récupération des statistiques");
    } finally {
      setLoading(false);
    }
  };

  const handleGetPrefilledDossiers = async () => {
    if (!demarcheNumber) {
      setError("Veuillez entrer un numéro de démarche");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await getPrefilledDossiers(parseInt(demarcheNumber));
      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.error);
      }
    } catch {
      setError(
        "Erreur inattendue lors de la récupération des dossiers préremplis"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fr-container fr-my-4w">
      <h1>Test de l'API GraphQL Démarches Simplifiées</h1>

      {/* Alert d'information */}
      <div className="fr-alert fr-alert--info fr-mb-3w">
        <h3 className="fr-alert__title">Page de test GraphQL</h3>
        <p>
          Cette page permet de tester les actions GraphQL pour interroger les
          démarches et dossiers.
        </p>
      </div>

      {/* ZONE 1 : Tests liés à la démarche */}
      <div
        className="fr-mb-6w"
        style={{ background: "#f6f6f6", padding: "2rem", borderRadius: "8px" }}
      >
        <h2 className="fr-h3">
          <span className="fr-icon-folder-2-line" aria-hidden="true"></span>{" "}
          Tests sur une démarche
        </h2>

        {/* Input numéro de démarche */}
        <div className="fr-input-group fr-mb-3w">
          <label className="fr-label" htmlFor="demarche-number">
            Numéro de démarche
          </label>
          <input
            className="fr-input"
            type="number"
            id="demarche-number"
            value={demarcheNumber}
            onChange={(e) => setDemarcheNumber(e.target.value)}
            placeholder="Ex: 12345"
          />
        </div>

        {/* Cartes des actions démarche */}
        <div className="fr-grid-row fr-grid-row--gutters">
          {/* Détails démarche */}
          <div className="fr-col-12 fr-col-md-6 fr-col-lg-3">
            <div className="fr-card">
              <div className="fr-card__body">
                <div className="fr-card__content">
                  <h3 className="fr-card__title">Détails de la démarche</h3>
                  <p className="fr-card__desc">
                    Récupère toutes les informations sur une démarche
                  </p>
                </div>
                <div className="fr-card__footer">
                  <button
                    className="fr-btn fr-btn--secondary fr-btn--sm"
                    onClick={handleGetDemarcheDetails}
                    disabled={loading}
                  >
                    Récupérer détails
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Liste dossiers */}
          <div className="fr-col-12 fr-col-md-6 fr-col-lg-3">
            <div className="fr-card">
              <div className="fr-card__body">
                <div className="fr-card__content">
                  <h3 className="fr-card__title">Liste des dossiers</h3>
                  <p className="fr-card__desc">
                    Récupère les 100 derniers dossiers de la démarche
                  </p>
                </div>
                <div className="fr-card__footer">
                  <button
                    className="fr-btn fr-btn--sm"
                    onClick={handleGetDossiers}
                    disabled={loading}
                  >
                    Lister dossiers
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Statistiques */}
          <div className="fr-col-12 fr-col-md-6 fr-col-lg-3">
            <div className="fr-card">
              <div className="fr-card__body">
                <div className="fr-card__content">
                  <h3 className="fr-card__title">Statistiques</h3>
                  <p className="fr-card__desc">
                    Calcule les statistiques de la démarche
                  </p>
                </div>
                <div className="fr-card__footer">
                  <button
                    className="fr-btn fr-btn--secondary fr-btn--sm"
                    onClick={handleGetStatistics}
                    disabled={loading}
                  >
                    Voir statistiques
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Dossiers préremplis */}
          <div className="fr-col-12 fr-col-md-6 fr-col-lg-3">
            <div className="fr-card">
              <div className="fr-card__body">
                <div className="fr-card__content">
                  <h3 className="fr-card__title">Dossiers préremplis</h3>
                  <p className="fr-card__desc">
                    Liste les dossiers créés via préremplissage
                  </p>
                </div>
                <div className="fr-card__footer">
                  <button
                    className="fr-btn fr-btn--sm"
                    onClick={handleGetPrefilledDossiers}
                    disabled={loading}
                  >
                    Dossiers préremplis
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ZONE 2 : Test sur un dossier spécifique */}
      <div
        className="fr-mb-4w"
        style={{
          background: "#fff3cd",
          padding: "2rem",
          borderRadius: "8px",
          border: "1px solid #ffc107",
        }}
      >
        <h2 className="fr-h3">
          <span className="fr-icon-file-text-line" aria-hidden="true"></span>{" "}
          Test sur un dossier spécifique
        </h2>

        <div className="fr-grid-row fr-grid-row--gutters fr-grid-row--middle">
          <div className="fr-col-12 fr-col-md-8">
            <div className="fr-input-group">
              <label className="fr-label" htmlFor="dossier-number">
                Numéro de dossier
                <span className="fr-hint-text">
                  Saisissez le numéro du dossier à récupérer
                </span>
              </label>
              <input
                className="fr-input"
                type="number"
                id="dossier-number"
                name="dossier-number"
                value={dossierNumber}
                onChange={(e) => setDossierNumber(e.target.value)}
                placeholder="Ex: 67890"
              />
            </div>
            <button
              className="fr-btn fr-btn--icon-left fr-icon-search-line"
              onClick={handleGetDossierByNumber}
              disabled={loading}
            >
              Récupérer le dossier
            </button>
          </div>
        </div>
      </div>

      {/* État de chargement */}
      {loading && (
        <div className="fr-alert fr-alert--info fr-mt-3w">
          <p className="fr-alert__title">Chargement en cours...</p>
        </div>
      )}

      {/* Affichage des erreurs */}
      {error && (
        <div className="fr-alert fr-alert--error fr-mt-3w">
          <h3 className="fr-alert__title">Erreur</h3>
          <p>{error}</p>
        </div>
      )}

      {/* Affichage du résultat */}
      {result && (
        <div className="fr-mt-3w">
          <h2>Résultat</h2>

          {/* Affichage spécifique pour les statistiques */}
          {isStatistics(result) && (
            <div className="fr-callout fr-mb-3w">
              <h3 className="fr-callout__title">Statistiques</h3>
              <div className="fr-grid-row fr-grid-row--gutters">
                <div className="fr-col-4">
                  <p className="fr-text--sm fr-mb-0">Total</p>
                  <p className="fr-text--lg fr-text--bold">{result.total}</p>
                </div>
                <div className="fr-col-4">
                  <p className="fr-text--sm fr-mb-0">Archivés</p>
                  <p className="fr-text--lg fr-text--bold">{result.archived}</p>
                </div>
                <div className="fr-col-4">
                  <p className="fr-text--sm fr-mb-0">États</p>
                  <p className="fr-text--lg fr-text--bold">
                    {Object.keys(result.byState).length}
                  </p>
                </div>
              </div>
              <div className="fr-mt-2w">
                <p className="fr-text--sm fr-mb-1w">Répartition par état :</p>
                {Object.entries(result.byState).map(([state, count]) => (
                  <span key={state} className="fr-badge fr-badge--sm fr-mr-1w">
                    {state}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Affichage pour DossiersConnection */}
          {isDossiersConnection(result) && (
            <div className="fr-callout fr-mb-3w">
              <h3 className="fr-callout__title">
                {result.nodes.length} dossier(s) trouvé(s)
              </h3>
              {result.pageInfo.hasNextPage && (
                <p className="fr-text--sm">
                  Il y a d'autres dossiers disponibles (pagination)
                </p>
              )}
              <div className="fr-table fr-mt-2w">
                <table>
                  <thead>
                    <tr>
                      <th>Numéro</th>
                      <th>État</th>
                      <th>Email</th>
                      <th>Archivé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.nodes.slice(0, 5).map((dossier) => (
                      <tr key={dossier.id}>
                        <td>{dossier.number}</td>
                        <td>
                          <span className="fr-badge fr-badge--sm">
                            {dossier.state}
                          </span>
                        </td>
                        <td>{dossier.usager?.email || "—"}</td>
                        <td>{dossier.archived ? "Oui" : "Non"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.nodes.length > 5 && (
                  <p className="fr-text--sm fr-mt-1w">
                    ... et {result.nodes.length - 5} autres dossiers
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Affichage JSON brut pour tous les résultats */}
          <div className="fr-callout">
            <h3 className="fr-callout__title">Données complètes (JSON)</h3>
            <pre
              style={{
                background: "#f6f6f6",
                padding: "1rem",
                borderRadius: "4px",
                overflow: "auto",
                fontSize: "0.875rem",
                maxHeight: "500px",
              }}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
