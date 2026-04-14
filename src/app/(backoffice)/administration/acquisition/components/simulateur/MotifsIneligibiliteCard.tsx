"use client";

import { useId } from "react";
import type { DemandesIneligiblesStats } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

interface MotifsIneligibiliteCardProps {
  stats: DemandesIneligiblesStats | null;
  loading: boolean;
}

/**
 * Carte "Motifs d'ineligibilite" — top raisons de non-eligibilite.
 * Affiche les motifs les plus frequents avec leur nombre de reponses.
 */
export default function MotifsIneligibiliteCard({ stats, loading }: MotifsIneligibiliteCardProps) {
  const tooltipId = useId();

  if (loading) {
    return (
      <div
        className="fr-p-3w"
        style={{
          backgroundColor: "var(--background-default-grey)",
          border: "1px solid var(--border-default-grey)",
        }}>
        <p className="fr-text--lg fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
          Chargement...
        </p>
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div
        className="fr-p-3w"
        style={{
          backgroundColor: "var(--background-default-grey)",
          border: "1px solid var(--border-default-grey)",
        }}>
        <h2 className="fr-text--lg fr-mb-0" style={{ fontWeight: 700 }}>
          Motifs d&apos;inéligibilité{" "}
          <button aria-describedby={tooltipId} type="button" className="fr-btn--tooltip fr-btn">
            Information
          </button>
          <span className="fr-tooltip fr-placement" id={tooltipId} role="tooltip">
            Données base de données
          </span>
        </h2>
        <p className="fr-mt-2w fr-text--sm" style={{ color: "var(--text-mention-grey)" }}>
          Aucune donnee disponible.
        </p>
      </div>
    );
  }

  // Top 4 motifs uniquement
  const motifsAffiches = stats.motifs.slice(0, 4);

  return (
    <div
      style={{
        backgroundColor: "var(--background-default-grey)",
        border: "1px solid var(--border-default-grey)",
      }}>
      {/* Header */}
      <div className="fr-px-2w fr-pt-2w">
        <h2 className="fr-text--lg fr-mb-0" style={{ fontWeight: 700 }}>
          Motifs d&apos;inéligibilité ({stats.total.toLocaleString("fr-FR")} dossiers){" "}
          <button aria-describedby={tooltipId} type="button" className="fr-btn--tooltip fr-btn">
            Information
          </button>
          <span className="fr-tooltip fr-placement" id={tooltipId} role="tooltip">
            Nombre de dossiers inéligibles distincts — un dossier peut avoir plusieurs motifs, les pourcentages sont
            calculés par rapport au total de dossiers
          </span>
        </h2>
        <p className="fr-text--sm fr-mb-0 fr-mt-1v" style={{ color: "var(--text-mention-grey)" }}>
          Motifs les plus fréquents — un dossier peut apparaître dans plusieurs motifs
        </p>
      </div>

      {/* Tableau DSFR */}
      <div className="fr-table fr-mb-0 fr-px-4v fr-mb-4w">
        <div className="fr-table__wrapper" style={{ overflow: "hidden" }}>
          <div className="fr-table__container" style={{ overflow: "hidden" }}>
            <div className="fr-table__content">
              <table>
                <caption className="sr-only">Motifs d&apos;ineligibilite les plus frequents</caption>
                <thead>
                  <tr>
                    <th scope="col">Raison</th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      Dossiers
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {motifsAffiches.map((motif) => (
                    <tr key={motif.raison}>
                      <td className="fr-text--sm">{motif.label}</td>
                      <td className="fr-text--sm" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <strong>{motif.count.toLocaleString("fr-FR")}</strong> ({motif.pourcentage}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
