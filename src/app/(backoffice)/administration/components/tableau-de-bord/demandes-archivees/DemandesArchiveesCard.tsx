"use client";

import { useId } from "react";
import { VariationBadge } from "../shared/VariationBadge";
import { AutresMotifsDrawer } from "./AutresMotifsDrawer";
import type { DemandesArchiveesStats, PeriodeId } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type { DepartementDisponible } from "@/features/backoffice/administration/statistiques/domain/types";

interface DemandesArchiveesCardProps {
  stats: DemandesArchiveesStats;
  loading?: boolean;
  periodeId: PeriodeId;
  codeDepartement: string;
  departements: DepartementDisponible[];
}

export function DemandesArchiveesCard({
  stats,
  loading = false,
  periodeId,
  codeDepartement,
  departements,
}: DemandesArchiveesCardProps) {
  const drawerId = `drawer-autres-motifs-${useId()}`;

  function openDrawer() {
    const dialog = document.getElementById(drawerId);
    if (dialog) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).dsfr?.(dialog)?.modal?.disclose();
    }
  }

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

  if (stats.total === 0) {
    return null;
  }

  // Agréger les "autres" en une ligne résumée
  const autresCount = stats.autresMotifs.reduce((acc, m) => acc + m.count, 0);
  const autresPourcentage = stats.total > 0 ? Math.round((autresCount / stats.total) * 100) : 0;

  return (
    <>
      <div
        style={{
          backgroundColor: "var(--background-default-grey)",
          border: "1px solid var(--border-default-grey)",
        }}>
        {/* Header + sous-titre */}
        <div className="fr-px-2w fr-pt-2w">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span
                className="fr-icon-folder-2-line"
                style={{ color: "var(--text-label-warning)" }}
                aria-hidden="true"
              />
              <h2 className="fr-text--lg fr-mb-0" style={{ fontWeight: 700 }}>
                Demandes archivées ({stats.total.toLocaleString("fr-FR")})
              </h2>
            </div>
            {/* TODO : lier vers la page de detail des demandes archivées */}
            <a className="fr-link fr-link--sm" href="#" onClick={(e) => e.preventDefault()}>
              Voir tout
              <span className="fr-icon-arrow-right-s-line fr-icon--sm fr-ml-1v" aria-hidden="true" />
            </a>
          </div>
          <p className="fr-text--sm fr-mb-0 fr-mt-1v" style={{ color: "var(--text-mention-grey)" }}>
            5 motifs les plus fréquents sur la période
          </p>
        </div>

        {/* Tableau DSFR */}
        <div className="fr-table fr-mb-0 fr-px-4v fr-mb-4w">
          <div className="fr-table__wrapper">
            <div className="fr-table__container">
              <div className="fr-table__content">
                <table>
                  <caption className="sr-only">Motifs d&apos;archivage les plus fréquents</caption>
                  <thead>
                    <tr>
                      <th scope="col">Raison</th>
                      <th scope="col" style={{ textAlign: "right" }}>
                        Nb réponses
                      </th>
                      <th scope="col" style={{ textAlign: "right" }}>
                        Variation
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.motifs.map((motif) => (
                      <tr
                        key={motif.raison}
                        style={{
                          borderLeft:
                            motif.variation !== null && motif.variation > 0
                              ? "4px solid var(--border-plain-warning)"
                              : "4px solid transparent",
                        }}>
                        <td>{motif.raison}</td>
                        <td style={{ textAlign: "right" }}>
                          <strong>{motif.count.toLocaleString("fr-FR")}</strong> ({motif.pourcentage}%)
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <VariationBadge variation={motif.variation} />
                        </td>
                      </tr>
                    ))}

                    {/* Ligne "Autre" agrégée */}
                    {autresCount > 0 && (
                      <tr style={{ borderLeft: "4px solid transparent" }}>
                        <td>
                          Autre{" "}
                          <a className="fr-link fr-ml-2v fr-link--sm" href="#" onClick={openDrawer}>
                            Voir les reponses
                          </a>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <strong>{autresCount.toLocaleString("fr-FR")}</strong> ({autresPourcentage}%)
                        </td>
                        <td style={{ textAlign: "right" }} />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer des autres motifs */}
      {stats.autresMotifs.length > 0 && (
        <AutresMotifsDrawer
          drawerId={drawerId}
          periodeId={periodeId}
          codeDepartement={codeDepartement}
          departements={departements}
        />
      )}
    </>
  );
}
