"use client";

import { useId, useMemo, useState } from "react";
import type {
  DepartementStats,
  TopDepartementsTriColumn,
} from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

const TRI_OPTIONS: { value: TopDepartementsTriColumn; label: string }[] = [
  { value: "transformationGlobale", label: "Transfo. globale" },
  { value: "simulations", label: "Simulations" },
  { value: "simulationsEligibles", label: "Simu. éligibles" },
  { value: "dossiersDN", label: "Dossiers DN" },
];

interface TopDepartementsCardProps {
  departements: DepartementStats[];
  loading?: boolean;
}

export function TopDepartementsCard({ departements, loading = false }: TopDepartementsCardProps) {
  const tooltipId = useId();
  const [triColonne, setTriColonne] = useState<TopDepartementsTriColumn>("transformationGlobale");

  const top5 = useMemo(() => {
    const sorted = [...departements].sort((a, b) => b[triColonne] - a[triColonne]);
    return sorted.slice(0, 5);
  }, [departements, triColonne]);

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

  if (departements.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: "var(--background-default-grey)",
        border: "1px solid var(--border-default-grey)",
      }}>
      {/* Header */}
      <div className="fr-px-2w fr-pt-2w">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="fr-icon-map-pin-2-line" aria-hidden="true" />
            <h2 className="fr-text--lg fr-mb-0" style={{ fontWeight: 700 }}>
              Top 5 départements{" "}
              <button aria-describedby={tooltipId} type="button" className="fr-btn--tooltip fr-btn">
                Information
              </button>
              <span className="fr-tooltip fr-placement" id={tooltipId} role="tooltip">
                Données base de données
              </span>
            </h2>
          </div>
          <div className="fr-select-group fr-mb-0">
            <label className="sr-only" htmlFor="tri-departements">
              Classer par
            </label>
            <select
              className="fr-select fr-select--sm"
              id="tri-departements"
              value={triColonne}
              onChange={(e) => setTriColonne(e.target.value as TopDepartementsTriColumn)}>
              {TRI_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Classer par : {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tableau DSFR */}
      <div className="fr-table fr-mb-0 fr-px-4v fr-mb-4w">
        <div className="fr-table__wrapper" style={{ overflow: "hidden" }}>
          <div className="fr-table__container" style={{ overflow: "hidden" }}>
            <div className="fr-table__content">
              <table>
                <caption className="sr-only">Top 5 départements par {triColonne}</caption>
                <thead>
                  <tr>
                    <th scope="col">Dpt</th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      Simu.
                    </th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      Simu. éligibles
                    </th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      Dossiers DN
                    </th>
                    <th scope="col" style={{ textAlign: "right" }}>
                      Transfo. globale{" "}
                      <span
                        className="fr-icon-information-line fr-icon--sm"
                        aria-hidden="true"
                        title="Dossiers DN / Simulations"
                        style={{ cursor: "help" }}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {top5.map((dept) => (
                    <tr key={dept.codeDepartement}>
                      <td className="fr-text--sm">
                        {dept.codeDepartement} {dept.nomDepartement}
                      </td>
                      <td className="fr-text--sm" style={{ textAlign: "right" }}>
                        {dept.simulations.toLocaleString("fr-FR")}
                      </td>
                      <td className="fr-text--sm" style={{ textAlign: "right" }}>
                        {dept.simulationsEligibles.toLocaleString("fr-FR")} ({dept.pourcentageEligibles}%)
                      </td>
                      <td className="fr-text--sm" style={{ textAlign: "right" }}>
                        {dept.dossiersDN.toLocaleString("fr-FR")}
                      </td>
                      <td className="fr-text--sm" style={{ textAlign: "right" }}>
                        {dept.transformationGlobale.toLocaleString("fr-FR", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                        %
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
