"use client";

import { useState } from "react";
import content from "../content/content.json";
import { getAllDepartementsEligibles } from "@/shared/constants/rga.constants";
import { AmoMode, getAmoMode } from "@/features/parcours/amo/domain/value-objects/departements-amo";

type PlafondRow = {
  phase: string;
  prestation: string;
  plafond: string;
  always?: "obligatoire" | "facultative";
  depends_on_amo?: boolean;
};

/**
 * Calcule le statut OBLIGATOIRE / FACULTATIVE d'une ligne en fonction du
 * département sélectionné. La fonction n'est appelée que lorsqu'un département
 * a été choisi (sinon l'empty state remplace toute la colonne).
 */
function getStatut(row: PlafondRow, codeDept: string): "obligatoire" | "facultative" {
  if (row.always) return row.always;
  // depends_on_amo : OBLIGATOIRE ou AV_AMO_FUSIONNES → AMO auto-attribué = obligatoire
  const mode = getAmoMode(codeDept);
  return mode === AmoMode.OBLIGATOIRE || mode === AmoMode.AV_AMO_FUSIONNES ? "obligatoire" : "facultative";
}

function StatutBadge({ statut }: { statut: "obligatoire" | "facultative" }) {
  const isObligatoire = statut === "obligatoire";
  return (
    <p className={`fr-badge fr-badge--sm ${isObligatoire ? "fr-badge--purple-glycine" : "fr-badge--grey"}`}>
      {isObligatoire ? "OBLIGATOIRE" : "FACULTATIVE"}
    </p>
  );
}

export default function PlafondsSubventionsTable() {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const c = content.montant_des_aides_section.plafonds_subventions;
  const departements = getAllDepartementsEligibles();
  const rows = c.rows as PlafondRow[];

  return (
    <div className="fr-mt-6w">
      <h3>{c.title}</h3>

      <div className="fr-select-group" style={{ maxWidth: "500px" }}>
        <label className="fr-label" htmlFor="select-departement-plafonds">
          {c.dropdown_label}
        </label>
        <select
          className="fr-select"
          id="select-departement-plafonds"
          value={selectedDept ?? ""}
          onChange={(e) => setSelectedDept(e.target.value || null)}>
          <option value="">{c.dropdown_placeholder}</option>
          {departements.map((dept) => (
            <option key={dept.code} value={dept.code}>
              {dept.code} — {dept.nom}
            </option>
          ))}
        </select>
      </div>

      <p className="fr-mt-2w fr-text--sm" style={{ color: "var(--text-action-high-blue-france)" }}>
        <span className="fr-icon-information-fill fr-mr-1w" aria-hidden="true" />
        {c.info}
      </p>

      <div className="fr-table fr-table--bordered fr-mt-4w">
        <div className="fr-table__wrapper">
          <div className="fr-table__container">
            <div className="fr-table__content">
              <table>
                <thead>
                  <tr>
                    <th scope="col">{c.headers.phase}</th>
                    <th scope="col">{c.headers.prestation}</th>
                    <th scope="col">{c.headers.plafond}</th>
                    <th scope="col">{c.headers.obligatoire}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const isFirstOfPhase = index === 0 || rows[index - 1].phase !== row.phase;
                    const phaseRowSpan = rows.filter((r) => r.phase === row.phase).length;

                    return (
                      <tr key={index}>
                        {isFirstOfPhase && <td rowSpan={phaseRowSpan}>{row.phase}</td>}
                        <td className="!whitespace-normal break-words">{row.prestation}</td>
                        <td className="text-right !whitespace-nowrap">{row.plafond}</td>
                        {selectedDept ? (
                          <td>
                            <StatutBadge statut={getStatut(row, selectedDept)} />
                          </td>
                        ) : index === 0 ? (
                          <td
                            rowSpan={rows.length}
                            className="text-center italic align-middle"
                            style={{
                              backgroundColor: "var(--background-alt-grey)",
                              color: "var(--text-mention-grey)",
                            }}>
                            {c.empty_state}
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
