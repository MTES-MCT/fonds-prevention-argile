"use client";

import { useId, useMemo, useState } from "react";
import type {
  DepartementStats,
  PeriodeId,
} from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";
import {
  construireLignesSimulationsDepartement,
  filtrerParPerimetre,
  repartitionPilotes,
  totaliserSimulations,
  versCsvSimulationsDepartement,
  type PerimetreDepartements,
  type TotalEntonnoir,
} from "@/features/backoffice/administration/acquisition/domain/simulations-departement";
import { DEPARTEMENTS_ELIGIBLES_RGA } from "@/shared/constants/rga.constants";

const PERIMETRES: { value: PerimetreDepartements; label: string }[] = [
  { value: "tous", label: "Tous les départements" },
  { value: "pilotes", label: `Les ${DEPARTEMENTS_ELIGIBLES_RGA.length} départements pilotes` },
  { value: "hors-pilotes", label: "Hors départements pilotes" },
];

interface SimulationsParDepartementTableProps {
  departements: DepartementStats[] | null;
  loading: boolean;
  /** Échec du chargement : distinct d'un vrai vide, avec relance. */
  erreur?: boolean;
  onReessayer?: () => void;
  periodeId: PeriodeId;
  /** Chiffres de l'entonnoir pour les mêmes filtres : le total « Tous les départements » les reprend à l'identique. */
  totalEntonnoir: TotalEntonnoir | null;
  totalEntonnoirChargement: boolean;
  /** Avec un filtre département, la part pilotes / hors pilotes n'a plus de sens : on la masque. */
  filtreDepartementActif?: boolean;
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
  loading,
  erreur = false,
  onReessayer,
  periodeId,
  totalEntonnoir,
  totalEntonnoirChargement,
  filtreDepartementActif = false,
}: SimulationsParDepartementTableProps) {
  const selectId = useId();
  const tooltipId = useId();
  const colonneTooltipId = useId();
  const [perimetre, setPerimetre] = useState<PerimetreDepartements>("tous");

  const toutesLesLignes = useMemo(() => construireLignesSimulationsDepartement(departements ?? []), [departements]);
  const lignes = useMemo(() => filtrerParPerimetre(toutesLesLignes, perimetre), [toutesLesLignes, perimetre]);
  const total = useMemo(() => totaliserSimulations(lignes), [lignes]);
  // Calculée sur toutes les lignes : le sélecteur de périmètre ne doit pas la faire varier.
  const repartition = useMemo(
    () => (filtreDepartementActif ? null : repartitionPilotes(toutesLesLignes)),
    [toutesLesLignes, filtreDepartementActif]
  );

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
        <div>
          <h2 className="fr-text--lg fr-mb-0" style={{ fontWeight: 700 }}>
            Visites avec un résultat par département{" "}
            <button aria-describedby={tooltipId} type="button" className="fr-btn--tooltip fr-btn">
              Information
            </button>
            <span className="fr-tooltip fr-placement" id={tooltipId} role="tooltip">
              Visites avec un résultat : visites Matomo ayant affiché un résultat dans le département, anonymes
              comprises. Comptes et dossiers DN : base de données.
            </span>
          </h2>
          <p className="fr-text--xs fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
            Cumul non dédoublonné entre pages et départements
          </p>
        </div>
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

      {repartition && (
        <div className="fr-px-2w fr-pt-2w">
          <p className="fr-text--lg fr-mb-1w" style={{ fontWeight: 700 }}>
            {repartition.partHorsPilotes} % des visites avec un résultat viennent de départements hors des{" "}
            {DEPARTEMENTS_ELIGIBLES_RGA.length} pilotes
          </p>
          <div
            aria-hidden="true"
            data-testid="barre-repartition-pilotes"
            style={{
              display: "flex",
              height: "0.75rem",
              overflow: "hidden",
              borderRadius: "0.375rem",
              backgroundColor: "var(--background-contrast-grey)",
            }}>
            <div
              style={{
                width: `${repartition.partPilotes}%`,
                backgroundColor: "var(--background-action-high-blue-france)",
              }}
            />
          </div>
          <p className="fr-text--sm fr-mt-1w fr-mb-0 flex flex-wrap gap-x-4">
            <span>
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: "0.75rem",
                  height: "0.75rem",
                  marginRight: "0.375rem",
                  backgroundColor: "var(--background-action-high-blue-france)",
                }}
              />
              {DEPARTEMENTS_ELIGIBLES_RGA.length} départements pilotes : {repartition.partPilotes} % (
              {nombre(repartition.pilotes)})
            </span>
            <span>
              <span
                aria-hidden="true"
                style={{
                  display: "inline-block",
                  width: "0.75rem",
                  height: "0.75rem",
                  marginRight: "0.375rem",
                  backgroundColor: "var(--background-contrast-grey)",
                }}
              />
              Autres départements : {repartition.partHorsPilotes} % ({nombre(repartition.horsPilotes)})
            </span>
          </p>
          <p className="fr-text--xs fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
            Estimation sur le cumul des lignes ci-dessous, à environ deux points près.
          </p>
        </div>
      )}

      {lignes.length === 0 && erreur ? (
        <div className="fr-px-2w fr-pb-2w fr-mt-2w">
          <div className="fr-alert fr-alert--error fr-alert--sm" role="alert">
            <p>Les visites avec un résultat par département n&apos;ont pas pu être chargées.</p>
          </div>
          {onReessayer && (
            <button type="button" className="fr-btn fr-btn--secondary fr-btn--sm fr-mt-2w" onClick={onReessayer}>
              Réessayer
            </button>
          )}
        </div>
      ) : lignes.length === 0 ? (
        <p className="fr-px-2w fr-pb-2w fr-mt-2w fr-text--sm" style={{ color: "var(--text-mention-grey)" }}>
          Aucune donnée disponible.
        </p>
      ) : (
        <div className="fr-table fr-mb-0 fr-px-4v fr-mb-4w">
          <div className="fr-table__wrapper">
            <div className="fr-table__container">
              <div className="fr-table__content">
                <table>
                  <caption className="sr-only">Visites avec un résultat par département</caption>
                  <thead>
                    <tr>
                      <th scope="col">Département</th>
                      <th scope="col" style={{ textAlign: "right" }}>
                        Visites avec un résultat{" "}
                        <button aria-describedby={colonneTooltipId} type="button" className="fr-btn--tooltip fr-btn">
                          Information
                        </button>
                        <span className="fr-tooltip fr-placement" id={colonneTooltipId} role="tooltip">
                          Visites ayant affiché un résultat dans ce département. Une visite qui touche plusieurs
                          départements ou plusieurs pages peut apparaître plusieurs fois : le total peut dépasser celui
                          de l&apos;entonnoir.
                        </span>
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
                      <tr key={l.codeDepartement}>
                        <td className="fr-text--sm">
                          {l.codeDepartement} {l.nomDepartement}
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
                    {perimetre === "tous" ? (
                      <>
                        <tr style={{ color: "var(--text-mention-grey)" }}>
                          <th scope="row" className="fr-text--sm" style={{ fontWeight: 400 }}>
                            Somme des lignes ({lignes.length} département{lignes.length > 1 ? "s" : ""})
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
                          <td />
                          <td />
                        </tr>
                        <tr style={{ fontWeight: 700 }}>
                          <th scope="row" className="fr-text--sm">
                            Total, même mesure que l&apos;entonnoir
                          </th>
                          {totalEntonnoir ? (
                            <>
                              <td className="fr-text--sm" style={{ textAlign: "right" }}>
                                {nombre(totalEntonnoir.simulations)}
                              </td>
                              <td className="fr-text--sm" style={{ textAlign: "right" }}>
                                {nombre(totalEntonnoir.eligibles)} ({totalEntonnoir.pourcentageEligibles} %)
                              </td>
                              <td className="fr-text--sm" style={{ textAlign: "right" }}>
                                {nombre(totalEntonnoir.nonEligibles)}
                              </td>
                            </>
                          ) : (
                            <td colSpan={3} className="fr-text--sm" style={{ textAlign: "right", fontWeight: 400 }}>
                              {totalEntonnoirChargement ? "…" : "Indisponible"}
                            </td>
                          )}
                          <td className="fr-text--sm" style={{ textAlign: "right" }}>
                            {nombre(total.comptesCrees)}
                          </td>
                          <td className="fr-text--sm" style={{ textAlign: "right" }}>
                            {nombre(total.dossiersDN)}
                          </td>
                        </tr>
                      </>
                    ) : (
                      <tr style={{ fontWeight: 700 }}>
                        <th scope="row" className="fr-text--sm">
                          Cumul des lignes affichées ({lignes.length} département{lignes.length > 1 ? "s" : ""})
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
                    )}
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
          <p className="fr-text--xs fr-mt-1w fr-mb-0" style={{ color: "var(--text-mention-grey)" }}>
            Somme des lignes : cumul non dédoublonné, une ligne par département et par page. Une visite qui touche
            plusieurs pages ou plusieurs départements peut y figurer plusieurs fois, d&apos;où l&apos;écart avec le
            total, qui reprend la mesure de l&apos;entonnoir (une visite ayant obtenu les deux résultats compte deux
            fois). Comptes créés et dossiers DN : somme des départements, hors parcours sans simulation ni département
            connu. Un département sans résultat ni compte créé n&apos;apparaît pas. Avant la mi-septembre 2026, une
            simulation arrêtée avant l&apos;adresse (un appartement, par exemple) partait sans département : elle
            n&apos;apparaît dans aucune ligne.
          </p>
        </div>
      )}
    </div>
  );
}
