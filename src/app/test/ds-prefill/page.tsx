import { useState } from "react";
import {
  createTestDossier,
  generatePrefillUrl,
  getDemarcheSchema,
} from "@/lib/actions/demarches-simplifies";

import type {
  DemarcheSchema,
  ChampDescriptor,
} from "@/lib/api/demarches-simplifiees/rest/types";
import { RestTestResult } from "@/lib/types/tests/tests-result";

export default function TestDsPrefillPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RestTestResult>(null);
  const [error, setError] = useState<string | null>(null);
  const [schema, setSchema] = useState<DemarcheSchema | null>(null);

  const handleGetSchema = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await getDemarcheSchema();
      if (response.success) {
        setSchema(response.data);
      } else {
        setError(response.error || "Erreur lors de la récupération du schéma");
      }
    } catch {
      setError("Erreur inattendue lors de la récupération du schéma");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDossier = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await createTestDossier();
      if (response.success) {
        setResult(response.data);
      } else {
        setError(response.error || "Erreur lors de la création du dossier");
      }
    } catch {
      setError("Erreur inattendue lors de la création du dossier");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateUrl = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await generatePrefillUrl();
      if (response.success) {
        setResult({ url: response.data });
      } else {
        setError(response.error || "Erreur lors de la génération de l'URL");
      }
    } catch {
      setError("Erreur inattendue lors de la génération de l'URL");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fr-container fr-my-4w">
      <h1>Test de l'API de préremplissage</h1>

      {/* Alert d'information */}
      <div className="fr-alert fr-alert--info fr-mb-3w">
        <h3 className="fr-alert__title">Page de test</h3>
        <p>
          Cette page permet de tester l'API de préremplissage de Démarches
          Simplifiées.
        </p>
      </div>

      {/* Grille de cartes */}
      <div className="fr-grid-row fr-grid-row--gutters">
        {/* Card 1: Récupérer le schéma */}
        <div className="fr-col-12 fr-col-md-4">
          <div className="fr-card">
            <div className="fr-card__body">
              <div className="fr-card__content">
                <h3 className="fr-card__title">1. Récupérer le schéma</h3>
                <p className="fr-card__desc">
                  Obtenir la structure de la démarche et afficher les champs
                  disponibles avec leurs identifiants
                </p>
              </div>
              <div className="fr-card__footer">
                <button
                  className="fr-btn fr-btn--secondary"
                  onClick={handleGetSchema}
                  disabled={loading}
                >
                  Récupérer le schéma
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Créer un dossier */}
        <div className="fr-col-12 fr-col-md-4">
          <div className="fr-card">
            <div className="fr-card__body">
              <div className="fr-card__content">
                <h3 className="fr-card__title">2. Créer un dossier (POST)</h3>
                <p className="fr-card__desc">
                  Créer un dossier prérempli via API POST. Méthode recommandée
                  pour beaucoup de données
                </p>
              </div>
              <div className="fr-card__footer">
                <button
                  className="fr-btn"
                  onClick={handleCreateDossier}
                  disabled={loading}
                >
                  Créer un dossier
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Générer URL */}
        <div className="fr-col-12 fr-col-md-4">
          <div className="fr-card">
            <div className="fr-card__body">
              <div className="fr-card__content">
                <h3 className="fr-card__title">3. Générer une URL (GET)</h3>
                <p className="fr-card__desc">
                  Générer une URL de préremplissage. Pour peu de données (limite
                  2000 caractères)
                </p>
              </div>
              <div className="fr-card__footer">
                <button
                  className="fr-btn fr-btn--tertiary"
                  onClick={handleGenerateUrl}
                  disabled={loading}
                >
                  Générer l'URL
                </button>
              </div>
            </div>
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

          {result && "dossier_url" in result && (
            <div className="fr-alert fr-alert--success fr-mb-2w">
              <p className="fr-alert__title">Dossier créé avec succès !</p>
            </div>
          )}

          <div className="fr-callout">
            <h3 className="fr-callout__title">Réponse de l'API</h3>
            <pre
              style={{
                background: "#f6f6f6",
                padding: "1rem",
                borderRadius: "4px",
                overflow: "auto",
                fontSize: "0.875rem",
              }}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>

          {result && "dossier_url" in result && (
            <div className="fr-mt-2w">
              <a
                href={result.dossier_url}
                target="_blank"
                rel="noopener noreferrer"
                className="fr-btn fr-icon-external-link-line fr-btn--icon-right"
              >
                Accéder au dossier prérempli
              </a>
            </div>
          )}

          {result && "url" in result && (
            <div className="fr-mt-2w">
              <p>
                <strong>URL de préremplissage :</strong>
              </p>
              <div className="fr-input-group">
                <input
                  className="fr-input"
                  type="text"
                  value={result.url}
                  readOnly
                  onClick={(e) => e.currentTarget.select()}
                />
              </div>
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="fr-btn fr-btn--sm fr-icon-external-link-line fr-btn--icon-right fr-mt-1w"
              >
                Ouvrir l'URL
              </a>
            </div>
          )}
        </div>
      )}

      {/* Affichage du schéma */}
      {schema && (
        <div className="fr-mt-3w">
          <h2>Schéma de la démarche</h2>

          {/* Informations générales */}
          <div className="fr-callout fr-mb-3w">
            <h3 className="fr-callout__title">Informations sur la démarche</h3>
            <ul className="fr-mb-0">
              <li>
                <strong>ID :</strong> {schema.id}
              </li>
              <li>
                <strong>Numéro :</strong> {schema.number}
              </li>
              <li>
                <strong>Titre :</strong> {schema.title}
              </li>
              <li>
                <strong>État :</strong>{" "}
                <span className="fr-badge fr-badge--info">{schema.state}</span>
              </li>
              {schema.description && (
                <li>
                  <strong>Description :</strong> {schema.description}
                </li>
              )}
            </ul>
          </div>

          {/* Tableau des champs */}
          <div className="fr-table">
            <table>
              <caption>Liste des champs de la démarche</caption>
              <thead>
                <tr>
                  <th scope="col">ID du champ</th>
                  <th scope="col">Label</th>
                  <th scope="col">Type</th>
                  <th scope="col">Requis</th>
                  <th scope="col">Description</th>
                </tr>
              </thead>
              <tbody>
                {schema.revision?.champDescriptors?.map(
                  (champ: ChampDescriptor) => (
                    <tr key={champ.id}>
                      <td>
                        <code
                          style={{
                            fontSize: "0.75rem",
                            background: "#f6f6f6",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "3px",
                            wordBreak: "break-all",
                          }}
                        >
                          {champ.id}
                        </code>
                      </td>
                      <td>{champ.label}</td>
                      <td>
                        <span className="fr-badge fr-badge--sm fr-badge--purple-glycine">
                          {champ.__typename.replace("ChampDescriptor", "")}
                        </span>
                      </td>
                      <td>
                        {champ.required ? (
                          <span className="fr-badge fr-badge--error fr-badge--sm">
                            Requis
                          </span>
                        ) : (
                          <span className="fr-badge fr-badge--info fr-badge--sm">
                            Optionnel
                          </span>
                        )}
                      </td>
                      <td>{champ.description || "—"}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Instructions pour utiliser les IDs */}
          <div className="fr-notice fr-notice--info fr-mt-3w">
            <div className="fr-container">
              <div className="fr-notice__body">
                <p className="fr-notice__title">
                  Comment utiliser ces identifiants ?
                </p>
                <p className="fr-text--sm">
                  Copiez les IDs des champs ci-dessus et remplacez-les dans le
                  fichier
                  <code>
                    {" "}
                    /src/lib/actions/demarches-simplifiees/prefill.actions.ts
                  </code>{" "}
                  dans la fonction <code>createTestDossier()</code> pour
                  préremplir les bons champs.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
