"use client";

import { useId, useMemo, useState } from "react";
import type {
  DepartementStats,
  PeriodeId,
  TopDepartementsMatomo,
} from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import {
  construireLignesSimulationsDepartement,
  lignesAffichees,
  totaliserSimulations,
  versCsvSimulationsDepartement,
  type PerimetreDepartements,
} from "@/features/backoffice/administration/acquisition/domain/simulations-departement";

const PERIMETRES: { value: PerimetreDepartements; label: string }[] = [
  { value: "tous", label: "Tous les départements" },
  { value: "pilotes", label: "Les 11 départements pilotes" },
  { value: "hors-pilotes", label: "Hors départements pilotes" },
];

interface SimulationsParDepartementTableProps {
  departements: DepartementStats[] | null;
  nonRenseigne: TopDepartementsMatomo["nonRenseigne"] | null;
  loading: boolean;
  periodeId: PeriodeId;
}

const nombre = (n: number) => n.toLocaleString("fr-FR");

function telechargerCsv(contenu: string, nomFichier: string) {
  const url = URL.createObjectURL(new Blob([contenu], { type: "text/csv;charset=utf-8" }));
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  lien.click();
  URL.revokeObjectURL(url);
}

const cadre = {
  backgroundColor: "var(--background-default-grey)",
  border: "1px solid var(--border-default-grey)",
};

export default function SimulationsParDepartementTable({
  departements,
  nonRenseigne,
  loading,
  periodeId,
}: SimulationsParDepartementTableProps) {
  const selectId = useId();
  const tooltipId = useId();
  const [perimetre, setPerimetre] = useState<PerimetreDepartements>("tous");

  const lignes = useMemo(
    () => lignesAffichees(construireLignesSimulationsDepartement(departements ?? []), nonRenseigne, perimetre),
    [departements, nonRenseigne, perimetre]
  );
  const total = useMemo(() => totaliserSimulations(lignes), [lignes]);
  const nombreDepartements = lignes.filter((l) => l.pilote !== null).length;
  const simulationsSansDepartement = nonRenseigne?.simulations ?? 0;

  const exporter = () => {
    const date = new Date().toISOString().slice(0, 10);
    telechargerCsv(
      versCsvSimulationsDepartement(lignes),
      `simulations-par-departement_${periodeId}_${perimetre}_${date}.csv`
    );
  };

  if (loading) {
    return (
      <div className="fr-p-3w" style={cadre}>
        <p className="fr-text--lg fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
          Chargement...
        </p>
      </div>
    );
  }

  return (
    <div style={cadre}>
      <div className="fr-px-2w fr-pt-2w flex flex-wrap items-start justify-between gap-2">
        <h2 className="fr-text--lg fr-mb-0" style={{ fontWeight: 700 }}>
          Simulations par département{" "}
          <button aria-describedby={tooltipId} type="button" className="fr-btn--tooltip fr-btn">
            Information
          </button>
          <span className="fr-tooltip fr-placement" id={tooltipId} role="tooltip">
            Simulations terminées (Matomo, anonymes comprises) : une simulation réaffichée sans changement ne compte
            qu&apos;une fois. Même total que l&apos;entonnoir. Comptes et dossiers DN : base de données.
          </span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="fr-select-group fr-mb-0">
            <label className="sr-only" htmlFor={selectId}>
              Départements affichés
            </label>
            <select
              className="fr-select fr-select--sm"
              id={selectId}
              value={perimetre}
              onChange={(e) => setPerimetre(e.target.value as PerimetreDepartements)}>
              {PERIMETRES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-download-line"
            onClick={exporter}
            disabled={lignes.length === 0}>
            Exporter en CSV
          </button>
        </div>
      </div>

      {lignes.length === 0 ? (
        <p className="fr-px-2w fr-pb-2w fr-mt-2w fr-text--sm" style={{ color: "var(--text-mention-grey)" }}>
          Aucune donnée disponible.
        </p>
      ) : (
        <div className="fr-table fr-mb-0 fr-px-4v fr-mb-4w">
          <div className="fr-table__wrapper">
            <div className="fr-table__container">
              <div className="fr-table__content">
                <table>
                  <caption className="sr-only">Simulations par département</caption>
                  <thead>
                    <tr>
                      <th scope="col">Département</th>
                      <th scope="col" style={{ textAlign: "right" }}>
                        Simulations
                      </th>
                      <th scope="col" style={{ textAlign: "right" }}>
                        Éligibles
                      </th>
                      <th scope="col" style={{ textAlign: "right" }}>
                        Non éligibles
                      </th>
                      <th scope="col" style={{ textAlign: "right" }}>
                        Comptes créés
                      </th>
                      <th scope="col" style={{ textAlign: "right" }}>
                        Dossiers DN créés
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignes.map((l) => (
                      <tr key={l.codeDepartement || "non-renseigne"}>
                        <td className="fr-text--sm">
                          {l.codeDepartement ? `${l.codeDepartement} ${l.nomDepartement}` : l.nomDepartement}
                          {l.pilote && (
                            <span className="fr-badge fr-badge--sm fr-badge--blue-ecume fr-ml-1w">Pilote</span>
                          )}
                        </td>
                        <td className="fr-text--sm" style={{ textAlign: "right" }}>
                          {nombre(l.simulations)}
                        </td>
                        <td className="fr-text--sm" style={{ textAlign: "right" }}>
                          {nombre(l.eligibles)} ({l.pourcentageEligibles} %)
                        </td>
                        <td className="fr-text--sm" style={{ textAlign: "right" }}>
                          {nombre(l.nonEligibles)}
                        </td>
                        <td className="fr-text--sm" style={{ textAlign: "right" }}>
                          {nombre(l.comptesCrees)}
                        </td>
                        <td className="fr-text--sm" style={{ textAlign: "right" }}>
                          {nombre(l.dossiersDN)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 700 }}>
                      <th scope="row" className="fr-text--sm">
                        Total ({nombreDepartements} départements
                        {nombreDepartements < lignes.length && " et non renseigné"})
                      </th>
                      <td className="fr-text--sm" style={{ textAlign: "right" }}>
                        {nombre(total.simulations)}
                      </td>
                      <td className="fr-text--sm" style={{ textAlign: "right" }}>
                        {nombre(total.eligibles)} ({total.pourcentageEligibles} %)
                      </td>
                      <td className="fr-text--sm" style={{ textAlign: "right" }}>
                        {nombre(total.nonEligibles)}
                      </td>
                      <td className="fr-text--sm" style={{ textAlign: "right" }}>
                        {nombre(total.comptesCrees)}
                      </td>
                      <td className="fr-text--sm" style={{ textAlign: "right" }}>
                        {nombre(total.dossiersDN)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
          {simulationsSansDepartement > 0 && (
            <p className="fr-text--xs fr-mt-1w fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
              {perimetre === "tous"
                ? "« Département non renseigné » : simulations terminées avant octobre 2026, quand le résultat ne portait pas encore son département."
                : `Les ${nombre(simulationsSansDepartement)} simulations sans département, antérieures à octobre 2026, ne sont comptées que sur « Tous les départements ».`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
