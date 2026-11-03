"use client";

import Link from "next/link";
import type { StructureAdministration } from "@/features/backoffice";

interface StructuresListProps {
  structures: StructureAdministration[];
  onRenommer: (structure: StructureAdministration) => void;
  onFusionner: (structure: StructureAdministration) => void;
  onDetacher: (structure: StructureAdministration) => void;
  isLoading?: boolean;
  modalRenommerId: string;
  modalFusionId: string;
  modalDetacherId: string;
}

export default function StructuresList({
  structures,
  onRenommer,
  onFusionner,
  onDetacher,
  isLoading = false,
  modalRenommerId,
  modalFusionId,
  modalDetacherId,
}: StructuresListProps) {
  if (structures.length === 0) {
    return (
      <div className="fr-callout">
        <p className="fr-callout__text">Aucune structure pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="fr-table">
      <table>
        <thead>
          <tr>
            <th scope="col">Structure</th>
            <th scope="col">Habilitations</th>
            <th scope="col">Agents</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {structures.map((structure) => {
            const actifs = structure.agents.filter((agent) => !agent.desactive).length;
            const desactives = structure.agents.length - actifs;

            return (
              <tr key={structure.id}>
                <td>
                  <span className="font-medium">{structure.nom}</span>
                </td>

                <td>
                  <div className="flex flex-col gap-1">
                    {structure.entrepriseAmo && (
                      <span className="text-sm">
                        <span className="fr-badge fr-badge--sm fr-badge--no-icon fr-badge--blue-cumulus fr-mr-1v">
                          AMO
                        </span>
                        <Link href="/administration/amo" className="fr-link fr-link--sm">
                          {structure.entrepriseAmo.nom}
                        </Link>
                      </span>
                    )}
                    {structure.allersVers && (
                      <span className="text-sm">
                        <span className="fr-badge fr-badge--sm fr-badge--no-icon fr-badge--yellow-tournesol fr-mr-1v">
                          Aller-vers
                        </span>
                        <Link href="/administration/allers-vers" className="fr-link fr-link--sm">
                          {structure.allersVers.nom}
                        </Link>
                      </span>
                    )}
                    {!structure.entrepriseAmo && !structure.allersVers && (
                      <span className="text-sm text-(--text-default-error)">
                        Aucune habilitation : ses agents n&apos;ont aucun rôle
                      </span>
                    )}
                  </div>
                </td>

                <td>
                  {structure.agents.length === 0 ? (
                    <span className="text-sm text-(--text-mention-grey)">Aucun agent</span>
                  ) : (
                    <details>
                      <summary className="text-sm cursor-pointer">
                        {actifs} actif{actifs > 1 ? "s" : ""}
                        {desactives > 0 && `, ${desactives} désactivé${desactives > 1 ? "s" : ""}`}
                      </summary>
                      <ul className="text-sm fr-mt-1v">
                        {structure.agents.map((agent) => (
                          <li key={agent.id} className={agent.desactive ? "text-(--text-mention-grey)" : undefined}>
                            {agent.nomComplet || agent.email}
                            {agent.desactive && " (désactivé)"}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </td>

                <td>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="fr-btn fr-btn--sm fr-btn--secondary fr-btn--icon-left fr-icon-edit-line"
                      aria-controls={modalRenommerId}
                      data-fr-opened="false"
                      onClick={() => onRenommer(structure)}
                      disabled={isLoading}>
                      Renommer
                    </button>
                    <button
                      type="button"
                      className="fr-btn fr-btn--sm fr-btn--secondary fr-btn--icon-left fr-icon-git-merge-line"
                      aria-controls={modalFusionId}
                      data-fr-opened="false"
                      onClick={() => onFusionner(structure)}
                      disabled={isLoading}>
                      Fusionner
                    </button>
                    {structure.entrepriseAmo && structure.allersVers && (
                      <button
                        type="button"
                        className="fr-btn fr-btn--sm fr-btn--tertiary fr-btn--icon-left fr-icon-scissors-line"
                        aria-controls={modalDetacherId}
                        data-fr-opened="false"
                        onClick={() => onDetacher(structure)}
                        disabled={isLoading}>
                        Détacher
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
