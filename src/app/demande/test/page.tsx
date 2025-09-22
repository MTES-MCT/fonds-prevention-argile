"use client";

import { useRGAContext } from "@/lib/form-rga/session";

export default function TestSessionPage() {
  const { data, hasData, isValid, errors, clearRGA, validateData, isLoading } =
    useRGAContext();

  const handleClearSession = () => {
    clearRGA();
    console.log("Session RGA nettoyée");
  };

  const handleRunValidation = () => {
    const validationErrors = validateData();
    console.log("Erreurs de validation:", validationErrors);
  };

  if (isLoading) {
    return (
      <div className="fr-container fr-my-4w">
        <p>Chargement des données de session...</p>
      </div>
    );
  }

  return (
    <div className="fr-container fr-my-4w">
      <div className="fr-grid-row fr-grid-row--center">
        <div className="fr-col-12 fr-col-md-10">
          <h1>Test Session RGA</h1>

          {/* État de la session */}
          <div className="fr-grid-row fr-grid-row--gutters fr-mb-4w">
            <div className="fr-col-12 fr-col-md-4">
              <div
                className={`fr-alert ${hasData ? "fr-alert--success" : "fr-alert--warning"}`}
              >
                <h3 className="fr-alert__title">État Session</h3>
                <p>
                  <strong>Données présentes :</strong> {hasData ? "Oui" : "Non"}
                </p>
                <p>
                  <strong>Données valides :</strong> {isValid ? "Oui" : "Non"}
                </p>
                <p>
                  <strong>Nombre d'erreurs :</strong> {errors.length}
                </p>
              </div>
            </div>

            {hasData && (
              <div className="fr-col-12 fr-col-md-8">
                <div className="fr-callout">
                  <h3 className="fr-callout__title">
                    Données RGAFormData en session :
                  </h3>

                  {/* Section Logement */}
                  {data?.logement && (
                    <div className="fr-mb-2w">
                      <h4>🏠 Logement :</h4>
                      {data.logement.adresse && (
                        <p>
                          <strong>Adresse :</strong> {data.logement.adresse}
                        </p>
                      )}
                      {data.logement.type && (
                        <p>
                          <strong>Type :</strong> {data.logement.type}
                        </p>
                      )}
                      {data.logement.annee_de_construction && (
                        <p>
                          <strong>Année :</strong>{" "}
                          {data.logement.annee_de_construction}
                        </p>
                      )}
                      {data.logement.zone_dexposition && (
                        <p>
                          <strong>Zone :</strong>{" "}
                          {data.logement.zone_dexposition}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Section Ménage */}
                  {data?.menage && (
                    <div className="fr-mb-2w">
                      <h4>👨‍👩‍👧‍👦 Ménage :</h4>
                      {data.menage.revenu && (
                        <p>
                          <strong>Revenu :</strong> {data.menage.revenu}€
                        </p>
                      )}
                      {data.menage.personnes && (
                        <p>
                          <strong>Personnes :</strong> {data.menage.personnes}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Section RGA */}
                  {data?.rga && (
                    <div className="fr-mb-2w">
                      <h4>🛡️ RGA :</h4>
                      {data.rga.assure !== undefined && (
                        <p>
                          <strong>Assuré :</strong>{" "}
                          {data.rga.assure ? "Oui" : "Non"}
                        </p>
                      )}
                      {data.rga.indemnise_rga !== undefined && (
                        <p>
                          <strong>Indemnisé :</strong>{" "}
                          {data.rga.indemnise_rga ? "Oui" : "Non"}
                        </p>
                      )}
                      {data.rga.peu_endommage !== undefined && (
                        <p>
                          <strong>Peu endommagé :</strong>{" "}
                          {data.rga.peu_endommage ? "Oui" : "Non"}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Section Taxe Foncière */}
                  {data?.taxeFonciere && (
                    <div className="fr-mb-2w">
                      <h4>🏛️ Taxe Foncière :</h4>
                      {data.taxeFonciere.commune_eligible !== undefined && (
                        <p>
                          <strong>Commune éligible :</strong>{" "}
                          {data.taxeFonciere.commune_eligible ? "OUI" : "NON"}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Section Vous */}
                  {data?.vous && (
                    <div>
                      <h4>👤 Vous :</h4>
                      <p>
                        Propriétaire condition:{" "}
                        {data.vous.proprietaire_condition ? "OUI" : "NON"}
                      </p>
                      <p>
                        Propriétaire occupant RGA:{" "}
                        {data.vous.proprietaire_occupant_rga ? "OUI" : "NON"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Données complètes (debug) */}
          {hasData && (
            <details className="fr-mt-4w">
              <summary>Données RGAFormData complètes (debug)</summary>
              <pre className="fr-text--xs">{JSON.stringify(data, null, 2)}</pre>
            </details>
          )}

          {/* Erreurs de validation */}
          {errors.length > 0 && (
            <div className="fr-alert fr-alert--error fr-mb-4w">
              <h3 className="fr-alert__title">
                Erreurs de validation ({errors.length})
              </h3>
              <ul>
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions de test */}
          <div className="fr-btns-group fr-mb-4w">
            <button
              className="fr-btn fr-btn--secondary"
              onClick={handleRunValidation}
            >
              Lancer validation
            </button>

            <button
              className="fr-btn fr-btn--tertiary"
              onClick={handleClearSession}
              disabled={!hasData}
            >
              Vider la session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
