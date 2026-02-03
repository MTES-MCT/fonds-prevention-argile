"use client";

import Link from "next/link";
import type { Prospect } from "../domain/types";
import { formatDate } from "@/shared/utils/format";

interface ProspectsTableProps {
  prospects: Prospect[];
}

const STEP_LABELS: Record<string, string> = {
  choix_amo: "Choix AMO",
  eligibilite: "Éligibilité",
  diagnostic: "Diagnostic",
  devis: "Devis",
  factures: "Factures",
};

/**
 * Tableau des prospects (particuliers sans AMO)
 */
export function ProspectsTable({ prospects }: ProspectsTableProps) {
  if (prospects.length === 0) {
    return (
      <div className="fr-callout">
        <p className="fr-callout__text">
          Aucun prospect trouvé dans votre territoire.
        </p>
      </div>
    );
  }

  return (
    <div className="fr-table">
      <table>
        <thead>
          <tr>
            <th>Particulier</th>
            <th>Commune</th>
            <th>Département</th>
            <th>Étape actuelle</th>
            <th>Dernière action</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {prospects.map((prospect) => (
            <tr key={prospect.parcoursId}>
              <td>
                <strong>
                  {prospect.particulier.prenom} {prospect.particulier.nom}
                </strong>
                <br />
                <small className="fr-text--sm">{prospect.particulier.email}</small>
              </td>
              <td>{prospect.logement.commune}</td>
              <td>{prospect.logement.codeDepartement}</td>
              <td>
                <span className="fr-badge fr-badge--blue-ecume fr-badge--sm">
                  {STEP_LABELS[prospect.currentStep] || prospect.currentStep}
                </span>
              </td>
              <td>
                {formatDate(prospect.updatedAt.toISOString())}
                <br />
                <small className="fr-text--sm fr-text--light">
                  Il y a {prospect.daysSinceLastAction} jour
                  {prospect.daysSinceLastAction > 1 ? "s" : ""}
                </small>
              </td>
              <td>
                <Link
                  href={`/espace-agent/prospects/${prospect.parcoursId}`}
                  className="fr-btn fr-btn--sm fr-btn--secondary"
                >
                  Voir le détail
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
