"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  creerExpertAction,
  DEPARTEMENTS_OFFICIELS,
  desactiverExpertAction,
  getExpertsAdministrationAction,
  MENTION_LIBRE_CHOIX,
  modifierExpertAction,
  reactiverExpertAction,
  type ExpertGestion,
  type ExpertsAdministration,
} from "@/features/backoffice";
import type { ActionResult } from "@/shared/types";
import { AdminBreadcrumb } from "../../shared/components/AdminBreadcrumb";
import ExpertsList from "./ExpertsList";
import ExpertFormModal, { type ExpertFormulaire } from "./ExpertFormModal";
import ExpertDesactiverModal from "./ExpertDesactiverModal";
import { ExpertsImport } from "./ExpertsImport";

const MODAL_FORMULAIRE_ID = "modal-formulaire-expert";
const MODAL_DESACTIVER_ID = "modal-desactiver-expert";

type OngletExperts = "liste" | "import";

function versSaisie(formulaire: ExpertFormulaire) {
  return {
    ...formulaire,
    departements: formulaire.departements.filter((d) => d.code),
  };
}

export default function ExpertsPanel() {
  const [donnees, setDonnees] = useState<ExpertsAdministration | null>(null);
  const [selection, setSelection] = useState<ExpertGestion | null>(null);
  const [onglet, setOnglet] = useState<OngletExperts>("liste");
  const [departement, setDepartement] = useState("");
  const [afficherDesactives, setAfficherDesactives] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Affichée dans la modale encore ouverte : derrière elle, le message ne se verrait pas.
  const [erreurOperation, setErreurOperation] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const result = await getExpertsAdministrationAction();
    if (result.success) setDonnees(result.data);
    else setError(result.error || "Erreur lors du chargement des experts");
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const experts = useMemo(() => {
    if (!donnees) return [];
    return donnees.experts.filter((expert) => {
      if (departement && !expert.departements.some((d) => d.code === departement)) return false;
      if (donnees.gestion && !afficherDesactives && "desactivation" in expert && expert.desactivation) return false;
      return true;
    });
  }, [donnees, departement, afficherDesactives]);

  const preparer = (expert: ExpertGestion | null) => {
    setSelection(expert);
    setErreurOperation(null);
    setNotice(null);
  };

  const executer = async <T,>(operation: () => Promise<ActionResult<T>>, succes: string): Promise<T | null> => {
    setIsSubmitting(true);
    setErreurOperation(null);
    setNotice(null);
    try {
      const result = await operation();
      if (!result.success) {
        setErreurOperation(result.error || "L'opération a échoué");
        return null;
      }
      setNotice(succes);
      await loadData();
      return result.data;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnregistrer = async (formulaire: ExpertFormulaire) =>
    (await executer(
      () =>
        selection
          ? modifierExpertAction({ ...versSaisie(formulaire), id: selection.id })
          : creerExpertAction(versSaisie(formulaire)),
      selection ? `« ${formulaire.nom.trim()} » est modifié.` : `« ${formulaire.nom.trim()} » est ajouté.`
    )) !== null;

  const handleDesactiver = async (raison: string) =>
    (await executer(
      () => desactiverExpertAction({ id: selection?.id, raison }),
      `« ${selection?.nom} » est désactivé.`
    )) !== null;

  const handleReactiver = async (expert: ExpertGestion) => {
    preparer(expert);
    await executer(() => reactiverExpertAction({ id: expert.id }), `« ${expert.nom} » est réactivé.`);
  };

  const gestion = donnees?.gestion ?? false;

  return (
    <>
      <section className="fr-container-fluid fr-pt-4w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
        <div className="fr-container">
          <AdminBreadcrumb currentPageLabel="Experts" />
          <div className="fr-mb-6w">
            <h1 className="fr-h2 fr-mb-1v">Experts</h1>
            <p className="text-(--text-mention-grey) mb-0">{MENTION_LIBRE_CHOIX}</p>
          </div>

          {error && (
            <div className="fr-alert fr-alert--error fr-mb-2w">
              <p>{error}</p>
            </div>
          )}
          {notice && (
            <div className="fr-alert fr-alert--success fr-mb-2w">
              <p>{notice}</p>
            </div>
          )}

          <div className="fr-tabs" style={{ borderBottom: "none" }}>
            <ul className="fr-tabs__list" role="tablist" aria-label="Vues Experts">
              <li role="presentation">
                <button
                  type="button"
                  className="fr-tabs__tab fr-icon-team-line fr-tabs__tab--icon-left"
                  tabIndex={onglet === "liste" ? 0 : -1}
                  role="tab"
                  aria-selected={onglet === "liste"}
                  aria-controls="tab-experts-liste-panel"
                  onClick={() => setOnglet("liste")}>
                  Liste des experts
                </button>
              </li>
              {gestion && (
                <li role="presentation">
                  <button
                    type="button"
                    className="fr-tabs__tab fr-icon-upload-line fr-tabs__tab--icon-left"
                    tabIndex={onglet === "import" ? 0 : -1}
                    role="tab"
                    aria-selected={onglet === "import"}
                    aria-controls="tab-experts-import-panel"
                    onClick={() => setOnglet("import")}>
                    Import
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      </section>

      <section className="fr-container-fluid fr-py-4w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          {onglet === "import" && gestion && (
            <div id="tab-experts-import-panel" role="tabpanel">
              <h2 className="fr-h3 fr-mb-3w">Import des experts</h2>
              <ExpertsImport onImportSuccess={loadData} />
            </div>
          )}

          {onglet === "liste" && (
            <div id="tab-experts-liste-panel" role="tabpanel">
              <div className="flex flex-wrap gap-6 items-end justify-between fr-mb-2w">
                <div className="flex flex-wrap gap-6 items-end">
                  <div className="fr-select-group mb-0">
                    <label className="fr-label" htmlFor="filtre-departement-experts">
                      Département
                    </label>
                    <select
                      className="fr-select"
                      id="filtre-departement-experts"
                      value={departement}
                      onChange={(e) => setDepartement(e.target.value)}>
                      <option value="">Tous les départements</option>
                      {DEPARTEMENTS_OFFICIELS.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.code} - {d.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                  {gestion && (
                    <div className="fr-checkbox-group">
                      <input
                        type="checkbox"
                        id="afficher-experts-desactives"
                        checked={afficherDesactives}
                        onChange={(e) => setAfficherDesactives(e.target.checked)}
                      />
                      <label className="fr-label" htmlFor="afficher-experts-desactives">
                        Afficher les experts désactivés
                      </label>
                    </div>
                  )}
                </div>
                {gestion && (
                  <button
                    type="button"
                    className="fr-btn fr-btn--icon-left fr-icon-add-line"
                    aria-controls={MODAL_FORMULAIRE_ID}
                    data-fr-opened="false"
                    onClick={() => preparer(null)}>
                    Ajouter un expert
                  </button>
                )}
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="text-(--text-mention-grey)">Chargement des experts...</div>
                </div>
              ) : (
                <ExpertsList
                  experts={experts}
                  gestion={gestion}
                  onModifier={preparer}
                  onDesactiver={preparer}
                  onReactiver={handleReactiver}
                  modalFormulaireId={MODAL_FORMULAIRE_ID}
                  modalDesactiverId={MODAL_DESACTIVER_ID}
                  isLoading={isSubmitting}
                />
              )}
            </div>
          )}
        </div>
      </section>

      {gestion && (
        <>
          <ExpertFormModal
            modalId={MODAL_FORMULAIRE_ID}
            expert={selection}
            onConfirm={handleEnregistrer}
            erreur={erreurOperation}
            isLoading={isSubmitting}
          />
          <ExpertDesactiverModal
            modalId={MODAL_DESACTIVER_ID}
            expert={selection}
            onConfirm={handleDesactiver}
            erreur={erreurOperation}
            isLoading={isSubmitting}
          />
        </>
      )}
    </>
  );
}
