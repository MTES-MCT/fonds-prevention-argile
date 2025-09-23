"use client";

import { useState } from "react";
import type { ChampDescriptor } from "@/lib/api/demarches-simplifiees/graphql/types";

interface DemarcheSchemaProps {
  champDescriptors?: ChampDescriptor[];
}

export default function DemarcheSchema({
  champDescriptors,
}: DemarcheSchemaProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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

            {/* Tableau des champs */}
            <div className="fr-table">
              <div className="fr-table__wrapper">
                <div className="fr-table__container">
                  <div className="fr-table__content">
                    <table>
                      <caption className="fr-sr-only">
                        Liste des champs de la démarche
                      </caption>
                      <thead>
                        <tr>
                          <th scope="col">Label</th>
                          <th scope="col">ID technique</th>
                          <th scope="col">Type</th>
                          <th scope="col">Statut</th>
                          <th scope="col">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredChamps.map((champ) => (
                          <tr key={champ.id}>
                            <td className="fr-text--bold">{champ.label}</td>
                            <td>
                              <code className="fr-text--xs">{champ.id}</code>
                            </td>
                            <td>
                              <span className="fr-badge fr-badge--sm fr-badge--purple-glycine">
                                {champ.__typename?.replace(
                                  "ChampDescriptor",
                                  ""
                                )}
                              </span>
                            </td>
                            <td>
                              {champ.required ? (
                                <span className="fr-badge fr-badge--sm fr-badge--error">
                                  Requis
                                </span>
                              ) : (
                                <span className="fr-badge fr-badge--sm fr-badge--no-icon">
                                  Optionnel
                                </span>
                              )}
                            </td>
                            <td className="fr-text--sm">
                              {champ.description || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

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
    </div>
  );
}
