"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { resoudreObservationAction } from "@/features/backoffice/administration/diagnostics/actions/reconciliation.actions";
import { InspectionDossierDn } from "./InspectionDossierDn";
import { VERDICT_LABELS } from "@/features/backoffice/administration/diagnostics/domain/diagnostics.types";
import { RESOLUTION_OBSERVATION } from "@/shared/database/schema";
import { STEP_LABELS } from "@/shared/domain/value-objects/step.enum";
import { getDossierDsDemandeUrl } from "@/features/parcours/dossiers-ds/utils";
import type { ObservationAvecDemandeur } from "@/shared/database/repositories";

interface FileReconciliationProps {
  observations: ObservationAvecDemandeur[];
  /** Texte affiché quand la file est vide — c'est le cas nominal, il doit rassurer. */
  messageVide: string;
  onResolved: () => void;
}

function demandeurLabel(o: ObservationAvecDemandeur): string {
  const nom = [o.demandeurPrenom, o.demandeurNom].filter(Boolean).join(" ").trim();
  if (nom) return nom;
  return o.parcoursId ? "Demandeur inconnu" : "Aucun parcours associé";
}

export function FileReconciliation({ observations, messageVide, onResolved }: FileReconciliationProps) {
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  // Inspection dépliée à la demande : chaque ouverture coûte un appel DN.
  const [inspecte, setInspecte] = useState<string | null>(null);

  async function resoudre(
    dsNumber: string,
    resolution: (typeof RESOLUTION_OBSERVATION)[keyof typeof RESOLUTION_OBSERVATION]
  ) {
    setErreur(null);
    setEnCours(dsNumber);
    try {
      const result = await resoudreObservationAction(dsNumber, resolution);
      if (result.success) onResolved();
      else setErreur(result.error);
    } finally {
      setEnCours(null);
    }
  }

  if (observations.length === 0) {
    return (
      <div className="fr-alert fr-alert--success fr-alert--sm">
        <p>{messageVide}</p>
      </div>
    );
  }

  return (
    <>
      {erreur && (
        <div className="fr-alert fr-alert--error fr-alert--sm fr-mb-2w">
          <p>{erreur}</p>
        </div>
      )}

      <div className="fr-table fr-table--bordered">
        <table>
          <thead>
            <tr>
              <th scope="col">Dossier DN</th>
              <th scope="col">Situation</th>
              <th scope="col">Demandeur</th>
              <th scope="col">Étape</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {observations.map((o) => {
              const meta = VERDICT_LABELS[o.verdict] ?? { label: o.verdict, explication: "" };
              return (
                <Fragment key={o.dsNumber}>
                  <tr>
                    <td>
                      <a href={getDossierDsDemandeUrl(Number(o.dsNumber))} target="_blank" rel="noopener noreferrer">
                        #{o.dsNumber}
                      </a>
                      {o.dsState && <div className="fr-text--xs fr-mb-0">{o.dsState}</div>}
                    </td>
                    <td>
                      <strong>{meta.label}</strong>
                      <div className="fr-text--xs fr-mb-0">{meta.explication}</div>
                      {o.detail && <div className="fr-text--xs fr-mb-0">{o.detail}</div>}
                    </td>
                    <td>
                      {o.parcoursId ? (
                        <Link href={`/espace-agent/dossiers/${o.parcoursId}`}>{demandeurLabel(o)}</Link>
                      ) : (
                        <span className="fr-text--xs">{demandeurLabel(o)}</span>
                      )}
                    </td>
                    <td>{o.step ? STEP_LABELS[o.step] : "—"}</td>
                    <td>
                      <ul className="fr-btns-group fr-btns-group--sm fr-btns-group--inline">
                        <li>
                          <button
                            type="button"
                            className="fr-btn fr-btn--secondary fr-btn--sm"
                            aria-expanded={inspecte === o.dsNumber}
                            onClick={() => setInspecte(inspecte === o.dsNumber ? null : o.dsNumber)}>
                            {inspecte === o.dsNumber ? "Masquer" : "Identifier"}
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            className="fr-btn fr-btn--secondary fr-btn--sm"
                            disabled={enCours === o.dsNumber}
                            onClick={() => resoudre(o.dsNumber, RESOLUTION_OBSERVATION.ARBITRE)}>
                            Marquer comme traité
                          </button>
                        </li>
                        <li>
                          <button
                            type="button"
                            className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm"
                            disabled={enCours === o.dsNumber}
                            onClick={() => resoudre(o.dsNumber, RESOLUTION_OBSERVATION.ECARTE)}>
                            Écarter
                          </button>
                        </li>
                      </ul>
                    </td>
                  </tr>

                  {inspecte === o.dsNumber && (
                    <tr>
                      <td colSpan={5}>
                        <InspectionDossierDn dsNumber={o.dsNumber} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
