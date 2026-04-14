"use client";

import { useId } from "react";
import { VariationBadge } from "../shared/VariationBadge";
import { AutresMotifsDrawer } from "./AutresMotifsDrawer";
import type {
  DemandesArchiveesStats,
  PeriodeId,
} from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import type { DepartementDisponible } from "@/features/backoffice/administration/acquisition/domain/types";

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
  const rawId = useId();
  const drawerId = `drawer-autres-motifs-${rawId.replace(/:/g, "-")}`;

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

  // Afficher tous les motifs du top 5 (sauf "Autre" fusionne dans la ligne recap)
  const motifsNommes = stats.motifs.filter((m) => m.raison !== "Autre");
  const autresDansTop = stats.motifs.filter((m) => m.raison === "Autre");
  const motifsAffiches = motifsNommes;
  const autresCount = [...autresDansTop, ...stats.autresMotifs].reduce((acc, m) => acc + m.count, 0);
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
                Demandes archivées ({stats.total.toLocaleString("fr-FR")}){" "}
                <button aria-describedby={`${drawerId}-tooltip`} type="button" className="fr-btn--tooltip fr-btn">
                  Information
                </button>
                <span className="fr-tooltip fr-placement" id={`${drawerId}-tooltip`} role="tooltip">
                  Données base de données
                </span>
              </h2>
            </div>
            <a className="fr-link fr-link--sm" href="/administration/demandeurs?tab=archivage">
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
          <div className="fr-table__wrapper" style={{ overflow: "hidden" }}>
            <div className="fr-table__container" style={{ overflow: "hidden" }}>
              <div className="fr-table__content">
                <table style={{ tableLayout: "fixed", width: "100%" }}>
                  <caption className="sr-only">Motifs d&apos;archivage les plus fréquents</caption>
                  <thead>
                    <tr>
                      <th scope="col">Raison</th>
                      <th scope="col" style={{ textAlign: "right", whiteSpace: "nowrap", width: "6rem" }}>
                        Nb rép.
                      </th>
                      <th scope="col" style={{ textAlign: "right", whiteSpace: "nowrap", width: "5rem" }}>
                        Var.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {motifsAffiches.map((motif) => (
                      <tr key={motif.raison}>
                        <td
                          className="fr-text--sm"
                          title={motif.raison}
                          style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 0 }}>
                          {motif.raison}
                        </td>
                        <td className="fr-text--sm" style={{ textAlign: "right" }}>
                          <strong>{motif.count.toLocaleString("fr-FR")}</strong> ({motif.pourcentage}%)
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <VariationBadge variation={motif.variation} invertColors />
                        </td>
                      </tr>
                    ))}

                    {/* Ligne "Autre" avec lien vers le drawer */}
                    {autresCount > 0 && (
                      <tr>
                        <td className="fr-text--sm">
                          Autre{" "}
                          <button type="button" className="fr-link fr-text--sm" onClick={openDrawer}>
                            Voir le détail
                          </button>
                        </td>
                        <td className="fr-text--sm" style={{ textAlign: "right" }}>
                          <strong>{autresCount.toLocaleString("fr-FR")}</strong> ({autresPourcentage}%)
                        </td>
                        <td />
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
      {autresCount > 0 && (
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
