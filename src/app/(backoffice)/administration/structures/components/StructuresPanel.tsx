"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  creerStructureAction,
  filtrerStructures,
  getStructuresAction,
  type CritereHabilitation,
  type StructureListee,
} from "@/features/backoffice";
import { Pagination } from "@/shared/components/Pagination/Pagination";
import { getDepartementName } from "@/shared/constants/departements.constants";
import { UserRole, type AdminRole } from "@/shared/domain/value-objects/user-role.enum";
import { AdminBreadcrumb } from "../../shared/components/AdminBreadcrumb";
import StructuresList from "./StructuresList";
import CreationStructureModal, { type DemandeCreation } from "./CreationStructureModal";
import ImportStructures, { type RoleImport } from "./ImportStructures";
import { CRITERES_HABILITATION, ecrireCriteresHabilitation, PARAMETRE_HABILITATION } from "./filtre-habilitation";

const MODAL_CREATION_ID = "modal-creer-structure";
const TAILLES_PAGE = [50, 100, 200];

type Onglet = "structures" | RoleImport;

const ONGLETS: { id: Onglet; libelle: string; icone: string }[] = [
  { id: "structures", libelle: "Structures", icone: "fr-icon-community-line" },
  { id: "amo", libelle: "Import AMO", icone: "fr-icon-upload-line" },
  { id: "allersVers", libelle: "Import Aller-vers", icone: "fr-icon-upload-line" },
  { id: "expert", libelle: "Import experts", icone: "fr-icon-upload-line" },
];

interface StructuresPanelProps {
  role: AdminRole;
  criteresInitiaux: CritereHabilitation[];
}

export default function StructuresPanel({ role, criteresInitiaux }: StructuresPanelProps) {
  const router = useRouter();
  // Les experts ne s'écrivent qu'avec EXPERTS_WRITE, propre au super-administrateur.
  const estSuperAdmin = role === UserRole.SUPER_ADMINISTRATEUR;
  const onglets = ONGLETS.filter(({ id }) => id !== "expert" || estSuperAdmin);
  const [onglet, setOnglet] = useState<Onglet>("structures");
  const [structures, setStructures] = useState<StructureListee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [criteres, setCriteres] = useState<CritereHabilitation[]>(criteresInitiaux);
  const [departement, setDepartement] = useState("");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [taillePage, setTaillePage] = useState(TAILLES_PAGE[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [erreurCreation, setErreurCreation] = useState<string | null>(null);
  const [versionCreation, setVersionCreation] = useState(0);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const result = await getStructuresAction();
    if (result.success) {
      setStructures(result.data);
      setError(null);
    } else {
      setError(result.error || "Erreur lors du chargement des structures");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const departements = useMemo(
    () =>
      [...new Set(structures.flatMap((structure) => structure.departements))].sort((a, b) =>
        a.localeCompare(b, "fr", { numeric: true })
      ),
    [structures]
  );

  const filtrees = useMemo(
    () => filtrerStructures(structures, { habilitations: criteres, departement: departement || null, recherche }),
    [structures, criteres, departement, recherche]
  );
  const pageAffichee = filtrees.slice((page - 1) * taillePage, page * taillePage);

  // Garde les critères dans l'adresse, pour les retrouver en revenant d'une fiche.
  const basculerCritere = (critere: CritereHabilitation) => {
    const coches = CRITERES_HABILITATION.map((c) => c.critere).filter((c) =>
      c === critere ? !criteres.includes(c) : criteres.includes(c)
    );
    setCriteres(coches);
    setPage(1);
    const url = new URL(window.location.href);
    const valeur = ecrireCriteresHabilitation(coches);
    if (valeur) url.searchParams.set(PARAMETRE_HABILITATION, valeur);
    else url.searchParams.delete(PARAMETRE_HABILITATION);
    window.history.replaceState(null, "", url);
  };

  const handleCreer = async (demande: DemandeCreation): Promise<boolean> => {
    setIsSubmitting(true);
    setErreurCreation(null);
    try {
      const result = await creerStructureAction(demande);
      if (!result.success) {
        setErreurCreation(result.error || "La création a échoué");
        return false;
      }
      router.push(`/administration/structures/${result.data.id}`);
      return true;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <section className="fr-container-fluid fr-pt-4w" style={{ borderBottom: "1px solid var(--border-default-grey)" }}>
        <div className="fr-container">
          <AdminBreadcrumb currentPageLabel="Structures" />
          <div className="fr-grid-row fr-grid-row--middle fr-grid-row--gutters fr-mb-4w">
            <div className="fr-col">
              <h1 className="fr-h2 fr-mb-1v">Structures</h1>
              <p style={{ color: "var(--text-mention-grey)", marginBottom: 0 }}>
                Une structure d&apos;accompagnement porte AMO, Aller-vers ou les deux, qui donnent leur rôle à ses
                agents.
                <br />
                Une structure expert ne porte que l&apos;expertise, qui n&apos;en donne aucun.
              </p>
            </div>
            <div className="fr-col-auto">
              <button
                type="button"
                className="fr-btn"
                aria-controls={MODAL_CREATION_ID}
                data-fr-opened="false"
                onClick={() => {
                  setErreurCreation(null);
                  setVersionCreation((version) => version + 1);
                }}>
                <span className="fr-icon-add-line fr-icon--sm mr-2" aria-hidden="true" />
                Créer une structure
              </button>
            </div>
          </div>

          {error && (
            <div className="fr-alert fr-alert--error fr-mb-2w">
              <p>{error}</p>
            </div>
          )}

          <div className="fr-tabs" style={{ borderBottom: "none" }}>
            <ul className="fr-tabs__list" role="tablist" aria-label="Vues des structures">
              {onglets.map(({ id, libelle, icone }) => (
                <li key={id} role="presentation">
                  <button
                    type="button"
                    className={`fr-tabs__tab ${icone} fr-tabs__tab--icon-left`}
                    tabIndex={onglet === id ? 0 : -1}
                    role="tab"
                    aria-selected={onglet === id}
                    aria-controls={`tab-structures-${id}-panel`}
                    onClick={() => setOnglet(id)}>
                    {libelle}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="fr-container-fluid fr-py-4w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          {onglet !== "structures" && (
            <div id={`tab-structures-${onglet}-panel`} role="tabpanel">
              <ImportStructures key={onglet} role={onglet} onImportSuccess={loadData} />
            </div>
          )}

          {onglet === "structures" && (
            <div id="tab-structures-structures-panel" role="tabpanel">
              <div className="flex flex-wrap gap-x-8 gap-y-4 items-end fr-mb-3w">
                <fieldset className="border-0 p-0 m-0">
                  <legend className="fr-label">Habilitations / Rôle</legend>
                  <div className="flex flex-wrap gap-x-6 items-center h-10 mt-2">
                    {CRITERES_HABILITATION.map(({ critere, libelle }) => (
                      <div key={critere} className="fr-checkbox-group fr-checkbox-group--sm">
                        <input
                          type="checkbox"
                          id={`critere-habilitation-${critere}`}
                          checked={criteres.includes(critere)}
                          onChange={() => basculerCritere(critere)}
                        />
                        <label className="fr-label" htmlFor={`critere-habilitation-${critere}`}>
                          {libelle}
                        </label>
                      </div>
                    ))}
                  </div>
                </fieldset>
                {/* Seul dans son bloc : DSFR donne une marge basse au groupe suivi d'un frère, qui le décalerait. */}
                <div>
                  <div className="fr-select-group">
                    <label className="fr-label" htmlFor="filtre-departement">
                      Département
                    </label>
                    <select
                      className="fr-select"
                      id="filtre-departement"
                      value={departement}
                      onChange={(e) => {
                        setDepartement(e.target.value);
                        setPage(1);
                      }}>
                      <option value="">Tous les départements</option>
                      {departements.map((code) => (
                        <option key={code} value={code}>
                          {code} - {getDepartementName(code)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {/* Même barre que la page Demandeurs, étirée jusqu'au bord ; le filtrage suit la frappe. */}
                <div className="fr-search-bar flex-1 min-w-72" role="search">
                  <label className="fr-label" htmlFor="recherche-structure">
                    Rechercher par nom ou SIRET
                  </label>
                  <input
                    className="fr-input"
                    placeholder="Rechercher par nom ou SIRET"
                    type="search"
                    id="recherche-structure"
                    value={recherche}
                    onChange={(e) => {
                      setRecherche(e.target.value);
                      setPage(1);
                    }}
                  />
                  <button type="button" className="fr-btn" title="Rechercher">
                    Rechercher
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="text-(--text-mention-grey)">Chargement des structures...</div>
                </div>
              ) : (
                <>
                  <p className="fr-text--bold fr-mb-1w">
                    {filtrees.length} structure{filtrees.length > 1 ? "s" : ""}
                  </p>
                  <StructuresList structures={pageAffichee} />
                  {filtrees.length > TAILLES_PAGE[0] && (
                    <Pagination
                      currentPage={page}
                      totalItems={filtrees.length}
                      pageSize={taillePage}
                      pageSizeOptions={TAILLES_PAGE}
                      onPageChange={setPage}
                      onPageSizeChange={(taille) => {
                        setTaillePage(taille);
                        setPage(1);
                      }}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <CreationStructureModal
        modalId={MODAL_CREATION_ID}
        expertPossible={estSuperAdmin}
        versionOuverture={versionCreation}
        onConfirm={handleCreer}
        erreur={erreurCreation}
        isLoading={isSubmitting}
      />
    </>
  );
}
