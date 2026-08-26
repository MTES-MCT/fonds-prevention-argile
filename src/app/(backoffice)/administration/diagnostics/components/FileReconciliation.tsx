"use client";

import { Fragment, useState } from "react";
import { resoudreObservationAction } from "@/features/backoffice/administration/diagnostics/actions/reconciliation.actions";
import { rattacherDossierDnAction } from "@/features/backoffice/espace-agent/dossiers/actions/rattacher-dossier-dn.actions";
import { InspectionDossierDn } from "./InspectionDossierDn";
import { VERDICT_LABELS } from "@/features/backoffice/administration/diagnostics/domain/diagnostics.types";
import { RESOLUTION_OBSERVATION } from "@/shared/database/schema";
import { STEP_LABELS } from "@/shared/domain/value-objects/step.enum";
import { getDossierDsDemandeUrl } from "@/features/parcours/dossiers-ds/utils";
import { MOTIF_LABELS, type CandidatDemandeur } from "@/features/parcours/dossiers-ds/domain/types/inspection.types";
import type { ObservationAvecDemandeur } from "@/shared/database/repositories";

interface FileReconciliationProps {
  observations: ObservationAvecDemandeur[];
  /** Texte affiché quand la file est vide — c'est le cas nominal, il doit rassurer. */
  messageVide: string;
  /**
   * « rattacher » : le dossier cherche son demandeur, l'action est de le lui rendre.
   * « arbitrer » : le demandeur est connu, c'est la situation qui demande une décision.
   */
  variante: "rattacher" | "arbitrer";
  onResolved: () => void;
}

function nomCandidat(c: CandidatDemandeur): string {
  return [c.prenom, c.nom].filter(Boolean).join(" ").trim() || c.email || `Parcours ${c.parcoursId.slice(0, 8)}`;
}

function demandeurLabel(o: ObservationAvecDemandeur): string {
  const nom = [o.demandeurPrenom, o.demandeurNom].filter(Boolean).join(" ").trim();
  return nom || "Demandeur inconnu";
}

export function FileReconciliation({ observations, messageVide, variante, onResolved }: FileReconciliationProps) {
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  // Détail DN déplié à la demande : chaque ouverture coûte un appel à Démarches Numériques.
  const [detaille, setDetaille] = useState<string | null>(null);

  async function agir(dsNumber: string, operation: () => Promise<{ success: boolean; error?: string }>) {
    setErreur(null);
    setEnCours(dsNumber);
    try {
      const result = await operation();
      if (result.success) onResolved();
      else setErreur(result.error ?? "Opération impossible");
    } finally {
      setEnCours(null);
    }
  }

  const resoudre = (
    dsNumber: string,
    resolution: (typeof RESOLUTION_OBSERVATION)[keyof typeof RESOLUTION_OBSERVATION]
  ) => agir(dsNumber, () => resoudreObservationAction(dsNumber, resolution));

  const rattacher = (dsNumber: string, parcoursId: string) =>
    agir(dsNumber, () => rattacherDossierDnAction(parcoursId, dsNumber));

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
              <th scope="col">{variante === "rattacher" ? "Demandeur probable" : "Demandeur"}</th>
              <th scope="col">Étape</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {observations.map((o) => {
              const meta = VERDICT_LABELS[o.verdict] ?? { label: o.verdict, explication: "" };
              const candidats = o.candidats ?? [];
              const candidatUnique = variante === "rattacher" && candidats.length === 1 ? candidats[0] : null;
              const occupe = enCours === o.dsNumber;

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
                      {/* Le demandeur est connu (files d'arbitrage) : rien à rapprocher. */}
                      {o.parcoursId ? (
                        <a
                          href={`/espace-agent/dossiers/${o.parcoursId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`${demandeurLabel(o)} - ouvre une nouvelle fenêtre`}>
                          {demandeurLabel(o)}
                        </a>
                      ) : candidats.length === 0 ? (
                        <span className="fr-text--xs">Aucune correspondance trouvée</span>
                      ) : (
                        <>
                          {candidats.length > 1 && (
                            <p className="fr-badge fr-badge--warning fr-badge--sm fr-mb-1w">
                              {candidats.length} demandeurs possibles
                            </p>
                          )}
                          <ul className="fr-raw-list">
                            {candidats.map((c) => (
                              <li key={c.parcoursId} className="fr-mb-1w">
                                <a
                                  href={`/espace-agent/dossiers/${c.parcoursId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={`${nomCandidat(c)} - ouvre une nouvelle fenêtre`}>
                                  {nomCandidat(c)}
                                </a>
                                <div className="fr-text--xs fr-mb-0">
                                  {c.motifs.map((m) => MOTIF_LABELS[m]).join(", ") || "correspondance partielle"}
                                </div>
                                {/* Plusieurs candidats : le choix est explicite, jamais deviné. */}
                                {candidats.length > 1 && (
                                  <button
                                    type="button"
                                    className="fr-btn fr-btn--secondary fr-btn--sm fr-mt-1v"
                                    disabled={occupe}
                                    onClick={() => rattacher(o.dsNumber, c.parcoursId)}>
                                    Rattacher à {nomCandidat(c)}
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </td>

                    <td>{o.step ? STEP_LABELS[o.step] : "—"}</td>

                    <td>
                      <ul className="fr-btns-group fr-btns-group--sm fr-btns-group--inline">
                        {candidatUnique && (
                          <li>
                            <button
                              type="button"
                              className="fr-btn fr-btn--sm"
                              disabled={occupe}
                              onClick={() => rattacher(o.dsNumber, candidatUnique.parcoursId)}>
                              Rattacher
                            </button>
                          </li>
                        )}

                        {variante === "arbitrer" && (
                          <li>
                            <button
                              type="button"
                              className="fr-btn fr-btn--secondary fr-btn--sm"
                              disabled={occupe}
                              onClick={() => resoudre(o.dsNumber, RESOLUTION_OBSERVATION.ARBITRE)}>
                              Marquer comme traité
                            </button>
                          </li>
                        )}

                        <li>
                          <button
                            type="button"
                            className="fr-btn fr-btn--tertiary fr-btn--sm"
                            aria-expanded={detaille === o.dsNumber}
                            onClick={() => setDetaille(detaille === o.dsNumber ? null : o.dsNumber)}>
                            {detaille === o.dsNumber ? "Masquer le détail" : "Voir le détail"}
                          </button>
                        </li>

                        <li>
                          {/* Sans correspondance, écarter devient l'issue la plus probable. */}
                          <button
                            type="button"
                            className={`fr-btn fr-btn--sm ${
                              candidats.length === 0 && !o.parcoursId
                                ? "fr-btn--secondary"
                                : "fr-btn--tertiary-no-outline"
                            }`}
                            disabled={occupe}
                            onClick={() => resoudre(o.dsNumber, RESOLUTION_OBSERVATION.ECARTE)}>
                            Écarter
                          </button>
                        </li>
                      </ul>
                    </td>
                  </tr>

                  {detaille === o.dsNumber && (
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
