"use client";

import { ChampDescriptor } from "@/features/parcours/dossiers-ds/adapters/graphql";
import { useState } from "react";

interface DemarcheSchemaProps {
  champDescriptors?: ChampDescriptor[];
}

type GroupBy = "none" | "type" | "required";

export default function DemarcheSchema({
  champDescriptors,
}: DemarcheSchemaProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isJsonExpanded, setIsJsonExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(champDescriptors, null, 2)
      );
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Erreur lors de la copie:", err);
    }
  };

  if (!champDescriptors || champDescriptors.length === 0) {
    return (
      <div className="fr-notice fr-notice--info fr-mb-4w">
        <div className="fr-notice__body">
          <p className="fr-notice__title">Aucun schéma disponible</p>
        </div>
      </div>
    );
  }

  // Filtrer les champs selon la recherche
  const filteredChamps = champDescriptors.filter(
    (champ) =>
      champ.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      champ.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Grouper les champs
  const groupedChamps: Record<string, ChampDescriptor[]> = {};

  if (groupBy === "none") {
    groupedChamps["Tous les champs"] = filteredChamps;
  } else if (groupBy === "type") {
    filteredChamps.forEach((champ) => {
      const type = champ.__typename?.replace("ChampDescriptor", "") || "Autre";
      if (!groupedChamps[type]) {
        groupedChamps[type] = [];
      }
      groupedChamps[type].push(champ);
    });
  } else if (groupBy === "required") {
    filteredChamps.forEach((champ) => {
      const group = champ.required ? "Champs requis" : "Champs optionnels";
      if (!groupedChamps[group]) {
        groupedChamps[group] = [];
      }
      groupedChamps[group].push(champ);
    });
  }

  return (
    <div className="fr-accordions-group fr-mb-4w">
      <section className="fr-accordion">
        <h3 className="fr-accordion__title">
          <button
            className="fr-accordion__btn"
            aria-expanded={isExpanded}
            aria-controls="schema-content"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            Schéma de la démarche ({champDescriptors.length} champs)
          </button>
        </h3>
        <div
          className={`fr-collapse ${isExpanded ? "fr-collapse--expanded" : ""}`}
          id="schema-content"
        >
          <div className="fr-py-3w">
            {/* Barre de recherche */}
            <div className="fr-search-bar fr-mb-3w" role="search">
              <label className="fr-label" htmlFor="schema-search">
                Rechercher un champ
              </label>
              <input
                className="fr-input"
                placeholder="Rechercher par nom ou ID..."
                type="search"
                id="schema-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Options de groupement */}
            <div className="fr-mb-3w">
              <fieldset className="fr-fieldset">
                <legend className="fr-fieldset__legend fr-text--regular">
                  Grouper par
                </legend>
                <div className="fr-fieldset__content">
                  <div className="fr-radio-group fr-radio-group--inline">
                    <input
                      type="radio"
                      id="group-none"
                      name="groupBy"
                      value="none"
                      checked={groupBy === "none"}
                      onChange={() => setGroupBy("none")}
                    />
                    <label className="fr-label" htmlFor="group-none">
                      Aucun
                    </label>
                  </div>
                  <div className="fr-radio-group fr-radio-group--inline">
                    <input
                      type="radio"
                      id="group-type"
                      name="groupBy"
                      value="type"
                      checked={groupBy === "type"}
                      onChange={() => setGroupBy("type")}
                    />
                    <label className="fr-label" htmlFor="group-type">
                      Type
                    </label>
                  </div>
                  <div className="fr-radio-group fr-radio-group--inline">
                    <input
                      type="radio"
                      id="group-required"
                      name="groupBy"
                      value="required"
                      checked={groupBy === "required"}
                      onChange={() => setGroupBy("required")}
                    />
                    <label className="fr-label" htmlFor="group-required">
                      Statut
                    </label>
                  </div>
                </div>
              </fieldset>
            </div>

            {/* Liste des champs en cards */}
            {Object.entries(groupedChamps).map(([groupName, champs]) => (
              <div key={groupName} className="fr-mb-4w">
                {groupBy !== "none" && (
                  <h4 className="fr-h6 fr-mb-2w">
                    {groupName} ({champs.length})
                  </h4>
                )}

                <div className="fr-grid-row fr-grid-row--gutters">
                  {champs.map((champ) => (
                    <div key={champ.id} className="fr-col-12 fr-col-md-6">
                      <div className="fr-card fr-card--no-border fr-card--shadow">
                        <div className="fr-card__body">
                          <div className="fr-card__content">
                            <h5 className="fr-card__title fr-mb-1w">
                              {champ.label}
                            </h5>

                            <div className="fr-mb-2w">
                              <code className="fr-text--xs">{champ.id}</code>
                            </div>

                            <div className="fr-mb-2w">
                              <span className="fr-badge fr-badge--sm fr-badge--purple-glycine fr-mr-1w">
                                {champ.__typename?.replace(
                                  "ChampDescriptor",
                                  ""
                                )}
                              </span>
                              {champ.required ? (
                                <span className="fr-badge fr-badge--sm fr-badge--error">
                                  Requis
                                </span>
                              ) : (
                                <span className="fr-badge fr-badge--sm fr-badge--no-icon">
                                  Optionnel
                                </span>
                              )}
                            </div>

                            {champ.description && (
                              <p className="fr-text--sm fr-mb-0">
                                {champ.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {filteredChamps.length === 0 && searchTerm && (
              <div className="fr-alert fr-alert--info fr-mt-2w">
                <p>Aucun champ ne correspond à votre recherche.</p>
              </div>
            )}

            {/* Résumé des types de champs */}
            <div className="fr-mt-3w">
              <h4 className="fr-h6">Résumé</h4>
              <div className="fr-tags-group">
                <span className="fr-tag">
                  {champDescriptors.filter((c) => c.required).length} champs
                  requis
                </span>
                <span className="fr-tag">
                  {champDescriptors.filter((c) => !c.required).length} champs
                  optionnels
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Accordéon JSON */}
      <section className="fr-accordion">
        <h3 className="fr-accordion__title">
          <button
            className="fr-accordion__btn"
            aria-expanded={isJsonExpanded}
            aria-controls="schema-json-content"
            onClick={() => setIsJsonExpanded(!isJsonExpanded)}
          >
            Schéma au format JSON
          </button>
        </h3>
        <div
          className={`fr-collapse ${isJsonExpanded ? "fr-collapse--expanded" : ""}`}
          id="schema-json-content"
        >
          <div className="fr-py-3w">
            <div className="fr-mb-2w">
              <button
                className="fr-btn fr-btn--secondary fr-btn--sm"
                onClick={handleCopyJson}
                type="button"
              >
                {copySuccess ? "Copié !" : "Copier le JSON"}
              </button>
            </div>
            <pre
              className="fr-p-2w"
              style={{
                backgroundColor: "#f6f6f6",
                borderRadius: "0.25rem",
                overflow: "auto",
                maxHeight: "500px",
              }}
            >
              <code>{JSON.stringify(champDescriptors, null, 2)}</code>
            </pre>
          </div>
        </div>
      </section>
    </div>
  );
}
