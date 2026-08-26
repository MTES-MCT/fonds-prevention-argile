"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  analyserReconciliationAction,
  listerFilesReconciliationAction,
  type FilesReconciliation,
} from "@/features/backoffice/administration/diagnostics/actions/reconciliation.actions";
import { Step, STEP_LABELS } from "@/shared/domain/value-objects/step.enum";
import DiagnosticsPanel from "./DiagnosticsPanel";
import { FileReconciliation } from "./FileReconciliation";
import { AdminBreadcrumb } from "../../shared/components/AdminBreadcrumb";

type Onglet = "rattacher" | "arbitrer" | "etats";

/** Ce que chaque onglet contient et ce qu'on est censé y faire. */
const AIDE_ONGLET: Record<Onglet, { titre: string; contenu: ReactNode }> = {
  rattacher: {
    titre: "Des dossiers existent côté Démarches Numériques sans qu'aucun parcours ne les suive",
    contenu: (
      <>
        <p className="fr-mb-1v">
          Ouvrez le dossier pour relever le nom et l&apos;adresse e-mail du demandeur, cherchez-le dans l&apos;espace
          agent, puis rattachez-le depuis son dossier : <strong>Gérer → Rattacher un dossier DN</strong>.
        </p>
        <p className="fr-mb-0">
          Si le demandeur n&apos;existe pas chez nous — dossier de test, démarche remplie hors dispositif — écartez la
          ligne. Traitez en priorité les dossiers acceptés ou en instruction : ce sont des demandeurs dont le parcours
          n&apos;avance pas alors que leur droit est acquis.
        </p>
      </>
    ),
  },
  arbitrer: {
    titre: "Le rattachement s'est arrêté volontairement : il y a une décision à prendre",
    contenu: (
      <>
        <p className="fr-mb-1v">
          Deux dossiers déposés pour une même étape, un lien FPA modifié à la main, ou un numéro déjà rattaché à un
          autre demandeur. Aucune règle ne peut trancher à votre place.
        </p>
        <p className="fr-mb-0">
          Tranchez d&apos;abord côté Démarches Numériques (classement sans suite du doublon, par exemple), puis
          rattachez le dossier retenu. <strong>Les deux boutons ci-dessous ne modifient aucune donnée</strong> : ils
          referment le signalement. Un cas refermé se rouvre si une prochaine analyse lui trouve un autre verdict.
        </p>
      </>
    ),
  },
  etats: {
    titre: "Vue détaillée de l'état de chaque parcours actif",
    contenu: (
      <p className="fr-mb-0">
        Calculée en base, sans interroger Démarches Numériques. La plupart de ces états sont <strong>normaux</strong> —
        un prérempli non déposé, notamment, est invisible de l&apos;API et ne signale aucun problème. À utiliser pour
        investiguer un cas précis, pas comme liste de travail.
      </p>
    ),
  },
};

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
      <section className="fr-container-fluid fr-pt-4w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
        <div className="fr-container">
          <AdminBreadcrumb currentPageLabel="Diagnostics DN" />
          <div className="fr-mb-4w">
            <h1 className="fr-h2 fr-mb-1v">Diagnostics DN</h1>
            <p style={{ color: "var(--text-mention-grey)", marginBottom: 0 }}>
              Ce qui demande une action sur les dossiers Démarches Numériques : ce qu&apos;il faut rattacher à un
              parcours, et ce qu&apos;il faut arbitrer. Réservé aux super-administrateurs.
            </p>
          </div>
        </div>
      </section>

      <section className="fr-container-fluid fr-py-4w bg-(--background-alt-blue-france)">
        <div className="fr-container">
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
              <div className="fr-callout fr-callout--blue-ecume fr-mb-3w">
                <h3 className="fr-callout__title fr-text--md">{AIDE_ONGLET[onglet].titre}</h3>
                <div className="fr-callout__text fr-text--sm">{AIDE_ONGLET[onglet].contenu}</div>
              </div>

              {onglet !== "etats" && (
                <div className="fr-mb-3w">
                  <p className="fr-text--sm fr-mb-1w">
                    L&apos;analyse interroge Démarches Numériques et remplit ces deux files. Elle ne modifie aucun
                    dossier.
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

              {onglet === "etats" && <DiagnosticsPanel embedded />}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
