"use client";

import { useState, useEffect } from "react";
import { getAllAllersVersWithRelationsAction, type AllersVers } from "@/features/seo/allers-vers";

interface AllersVersWithRelations extends AllersVers {
  departements?: { codeDepartement: string }[];
  epci?: { codeEpci: string }[];
}

interface AllersVersListProps {
  onEdit: (allersVers: AllersVersWithRelations) => void;
  refreshTrigger: number;
}

export function AllerVersList({ onEdit, refreshTrigger }: AllersVersListProps) {
  const [allersVers, setAllersVers] = useState<AllersVersWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAllersVers();
  }, [refreshTrigger]);

  const loadAllersVers = async () => {
    setIsLoading(true);
    try {
      const result = await getAllAllersVersWithRelationsAction();
      if (result.success && result.data) {
        setAllersVers(result.data);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des Allers Vers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fr-mb-6w">
      {isLoading ? (
        <div className="fr-py-4w text-center">
          <p>Chargement des structures...</p>
        </div>
      ) : allersVers.length === 0 ? (
        <div className="fr-callout fr-callout--info">
          <p className="fr-callout__text">
            Aucune structure enregistrée pour le moment. Importez un fichier Excel pour commencer.
          </p>
        </div>
      ) : (
        <div className="fr-table fr-table--lg fr-table--bordered fr-table--multiline">
          <div className="fr-table__wrapper">
            <div className="fr-table__container">
              <div className="fr-table__content">
                <table>
                  <caption className="sr-only">Liste des structures Allers Vers</caption>
                  <thead>
                    <tr>
                      <th scope="col">Nom</th>
                      <th scope="col">Départements</th>
                      <th scope="col">Codes EPCI</th>
                      <th scope="col">Emails</th>
                      <th scope="col">Téléphone</th>
                      <th scope="col">Adresse</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allersVers.map((av) => (
                      <tr key={av.id}>
                        <td>{av.nom}</td>
                        <td className="fr-text--sm">
                          {av.departements && av.departements.length > 0
                            ? av.departements.map((d) => d.codeDepartement).join(", ")
                            : "-"}
                        </td>
                        <td className="fr-text--sm">
                          {av.epci && av.epci.length > 0 ? av.epci.map((e) => e.codeEpci).join(", ") : "-"}
                        </td>
                        <td className="fr-text--sm">
                          {av.emails && av.emails.length > 0
                            ? av.emails.map((email, idx) => <div key={idx}>{email}</div>)
                            : "-"}
                        </td>
                        <td>{av.telephone || "-"}</td>
                        <td className="fr-text--sm">{av.adresse || "-"}</td>
                        <td>
                          <button
                            type="button"
                            className="fr-btn fr-btn--sm fr-btn--secondary"
                            onClick={() => onEdit(av)}
                            title="Modifier">
                            Modifier
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {allersVers.length > 0 && (
        <p className="fr-text--sm fr-mt-2w text-gray-600">
          Total : {allersVers.length} structure{allersVers.length > 1 ? "s" : ""} enregistrée
          {allersVers.length > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
