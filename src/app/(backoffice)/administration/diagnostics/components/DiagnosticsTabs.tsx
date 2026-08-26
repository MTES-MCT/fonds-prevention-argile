"use client";

import { useCallback, useEffect, useState } from "react";
import {
  analyserReconciliationAction,
  listerFilesReconciliationAction,
  type FilesReconciliation,
} from "@/features/backoffice/administration/diagnostics/actions/reconciliation.actions";
import { Step, STEP_LABELS } from "@/shared/domain/value-objects/step.enum";
import DiagnosticsPanel from "./DiagnosticsPanel";
import { FileReconciliation } from "./FileReconciliation";

type Onglet = "rattacher" | "arbitrer" | "etats";

const STEPS_ANALYSABLES = [Step.ELIGIBILITE, Step.DIAGNOSTIC, Step.DEVIS];

/**
 * Diagnostic DN en trois onglets (ADR-0027). Deux files de travail — ce qu'il faut rattacher,
 * ce qu'il faut arbitrer — et la vue détaillée par état, qui reste utile mais n'est plus le
 * point d'entrée : la plupart de ses états sont normaux et ne demandent rien.
 */
export default function DiagnosticsTabs() {
  const [onglet, setOnglet] = useState<Onglet>("rattacher");
  const [files, setFiles] = useState<FilesReconciliation | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [analyseEnCours, setAnalyseEnCours] = useState<Step | null>(null);
  const [messageAnalyse, setMessageAnalyse] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const result = await listerFilesReconciliationAction();
    if (result.success) setFiles(result.data);
    else setErreur(result.error);
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function analyser(step: Step) {
    setErreur(null);
    setMessageAnalyse(null);
    setAnalyseEnCours(step);

    try {
      const result = await analyserReconciliationAction(step);
      if (!result.success) {
        setErreur(result.error);
        return;
      }

      const { examines, scanComplet, raison } = result.data;
      setMessageAnalyse(
        scanComplet
          ? `${STEP_LABELS[step]} : ${examines} dossier(s) déposé(s) examiné(s).`
          : `${STEP_LABELS[step]} : analyse interrompue (${raison}). Les résultats sont partiels, à relancer.`
      );
      await charger();
    } finally {
      setAnalyseEnCours(null);
    }
  }

  const nbRattacher = files?.aRattacher.length ?? 0;
  const nbArbitrer = files?.aArbitrer.length ?? 0;

  const onglets: Array<{ id: Onglet; label: string }> = [
    { id: "rattacher", label: `À rattacher${nbRattacher ? ` (${nbRattacher})` : ""}` },
    { id: "arbitrer", label: `À arbitrer${nbArbitrer ? ` (${nbArbitrer})` : ""}` },
    { id: "etats", label: "États des parcours" },
  ];

  return (
    <>
      {erreur && (
        <div className="fr-alert fr-alert--error fr-mb-2w">
          <p>{erreur}</p>
        </div>
      )}

      <div className="fr-tabs">
        <ul className="fr-tabs__list" role="tablist" aria-label="Diagnostic Démarches Numériques">
          {onglets.map((o) => (
            <li key={o.id} role="presentation">
              <button
                type="button"
                className="fr-tabs__tab"
                role="tab"
                aria-selected={onglet === o.id}
                tabIndex={onglet === o.id ? 0 : -1}
                onClick={() => setOnglet(o.id)}>
                {o.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="fr-tabs__panel fr-tabs__panel--selected" role="tabpanel">
          {onglet !== "etats" && (
            <div className="fr-mb-3w">
              <p className="fr-text--sm fr-mb-1w">
                L&apos;analyse interroge Démarches Numériques et remplit ces deux files. Elle ne modifie aucun dossier.
              </p>
              <ul className="fr-btns-group fr-btns-group--sm fr-btns-group--inline">
                {STEPS_ANALYSABLES.map((step) => (
                  <li key={step}>
                    <button
                      type="button"
                      className="fr-btn fr-btn--secondary fr-btn--sm"
                      disabled={analyseEnCours !== null}
                      onClick={() => analyser(step)}>
                      {analyseEnCours === step ? "Analyse en cours…" : `Analyser ${STEP_LABELS[step]}`}
                    </button>
                  </li>
                ))}
              </ul>
              {messageAnalyse && (
                <div className="fr-alert fr-alert--info fr-alert--sm fr-mt-2w">
                  <p>{messageAnalyse}</p>
                </div>
              )}
            </div>
          )}

          {onglet === "rattacher" && (
            <FileReconciliation
              observations={files?.aRattacher ?? []}
              messageVide="Aucun dossier en attente de rattachement."
              onResolved={charger}
            />
          )}

          {onglet === "arbitrer" && (
            <FileReconciliation
              observations={files?.aArbitrer ?? []}
              messageVide="Aucun conflit à arbitrer."
              onResolved={charger}
            />
          )}

          {onglet === "etats" && <DiagnosticsPanel />}
        </div>
      </div>
    </>
  );
}
