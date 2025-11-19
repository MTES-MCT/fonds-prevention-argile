"use client";

import { useState, useEffect } from "react";
import { Amo } from "@/features/parcours/amo";
import { getAllAmos } from "@/features/parcours/amo/actions";

interface AmoWithRelations extends Amo {
  communes?: { codeInsee: string }[];
  epci?: { codeEpci: string }[];
}

interface AmoListProps {
  onEdit: (amo: AmoWithRelations) => void;
  refreshTrigger: number;
}

export function AmoList({ onEdit, refreshTrigger }: AmoListProps) {
  const [amos, setAmos] = useState<AmoWithRelations[]>([]);
  const [isLoadingAmos, setIsLoadingAmos] = useState(true);

  useEffect(() => {
    loadAmos();
  }, [refreshTrigger]);

  const loadAmos = async () => {
    setIsLoadingAmos(true);
    try {
      const result = await getAllAmos();
      if (result.success && result.data) {
        setAmos(result.data);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des AMO:", error);
    } finally {
      setIsLoadingAmos(false);
    }
  };

  return (
    <div className="w-full">
      <h2 className="fr-h4 fr-mb-2w">Liste des AMO enregistrées</h2>

      {isLoadingAmos ? (
        <div className="fr-py-4w text-center">
          <p>Chargement des AMO...</p>
        </div>
      ) : amos.length === 0 ? (
        <div className="fr-callout fr-callout--info">
          <p className="fr-callout__text">
            Aucune AMO enregistrée pour le moment. Importez un fichier Excel pour commencer.
          </p>
        </div>
      ) : (
        <div className="fr-table fr-table--lg fr-table--bordered fr-table--multiline">
          <div className="fr-table__wrapper">
            <div className="fr-table__container">
              <div className="fr-table__content">
                <table>
                  <caption className="sr-only">Liste des entreprises AMO</caption>
                  <thead>
                    <tr>
                      <th scope="col">Nom</th>
                      <th scope="col">SIRET</th>
                      <th scope="col">Départements</th>
                      <th scope="col">Codes EPCI</th>
                      <th scope="col">Emails</th>
                      <th scope="col">Téléphone</th>
                      <th scope="col">Adresse</th>
                      <th scope="col">Codes INSEE spécifiques</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {amos.map((amo) => (
                      <tr key={amo.id}>
                        <td>{amo.nom}</td>
                        <td className="fr-text--sm">{amo.siret || "-"}</td>
                        <td className="fr-text--sm">{amo.departements || "-"}</td>
                        <td className="fr-text--sm">
                          {amo.epci && amo.epci.length > 0 ? amo.epci.map((e) => e.codeEpci).join(", ") : "-"}
                        </td>
                        <td className="fr-text--sm">
                          {amo.emails ? amo.emails.split(";").map((email, idx) => <div key={idx}>{email}</div>) : "-"}
                        </td>
                        <td>{amo.telephone || "-"}</td>
                        <td className="fr-text--sm">{amo.adresse || "-"}</td>
                        <td className="fr-text--sm">
                          {amo.communes && amo.communes.length > 0
                            ? amo.communes.map((c) => c.codeInsee).join(", ")
                            : "-"}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="fr-btn fr-btn--sm fr-btn--secondary"
                            onClick={() => onEdit(amo)}
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

      {amos.length > 0 && (
        <p className="fr-text--sm fr-mt-2w text-gray-600">
          Total : {amos.length} AMO enregistrée{amos.length > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
