"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getDossiersTerritoireDataAction,
  type DossiersTerritoireData,
} from "@/features/backoffice/espace-agent/dossiers/actions/get-dossiers-territoire-data.action";
import type { DossierItem } from "@/features/backoffice/espace-agent/dossiers/domain/types";
import {
  getDossierStepLabel,
  getResponsableDisplayName,
} from "@/features/backoffice/espace-agent/dossiers/domain";
import type { DossierEtat } from "@/features/parcours/core/domain/services/dossier-etat.service";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { DossiersSuivisHeader } from "./DossiersSuivisHeader";
import { DossiersSuivisTable } from "./DossiersSuivisTable";
import { DossiersKpiCards, type DossiersKpiCounters } from "./DossiersKpiCards";
import { Pagination } from "@/shared/components/Pagination/Pagination";

type Scope = "mine" | "all";

interface DossiersPanelProps {
  /** Affiche le bouton "+ Nouveau dossier" (rôles AMO et/ou Aller-vers). */
  canCreateDossier?: boolean;
  /**
   * Onglet actif au chargement : "mine" pour les agents AMO/AV/hybrides
   * (filtre par `canActAsResponsable`), "all" pour les super-admins.
   */
  defaultScope?: Scope;
  /** Prénom de l'agent connecté (« Bonjour … »). */
  prenom: string | null;
}

// Ordre chronologique des libellés d'étape pour le filtre « Étape »
// (suit le parcours : Création de compte → Choix AMO → Éligibilité → Diag → Devis → Factures),
// + « Non-éligible » en fin. Sert à trier les options autrement qu'alphabétiquement.
const ETAPE_LABEL_ORDER: string[] = [
  ...[Step.INVITATION, Step.CHOIX_AMO, Step.ELIGIBILITE, Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES].map((s) =>
    getDossierStepLabel(s, null)
  ),
  "Non-éligible",
];

/**
 * Whitelist canonique des options du filtre par colonne « En attente de ».
 *
 * Représente les 5 actions/états qui aident l'agent à prioriser son travail
 * (« qui dois-je relancer ? quel dossier traiter en premier ? »). L'état REFUSE
 * n'apparaît pas dans le filtre (dossier terminal, pas « à traiter »), mais
 * reste visible dans le tableau avec son badge.
 *
 * L'ordre suit le parcours métier (pas l'ordre alphabétique).
 */
const EN_ATTENTE_FILTRABLES: ReadonlyArray<{ value: DossierEtat; label: string }> = [
  { value: "AV_QUALIFICATION", label: "AV" },
  { value: "EN_ATTENTE_AMO", label: "AMO" },
  { value: "MENAGE", label: "Ménage" },
  { value: "DDT", label: "DDT" },
  { value: "ARCHIVE", label: "Archivé" },
];

/**
 * Panel unifié des dossiers — tags Mes/Tous, filtre EPCI et recherche.
 */
export function DossiersPanel({
  canCreateDossier = false,
  defaultScope = "all",
  prenom,
}: DossiersPanelProps) {
  const [data, setData] = useState<DossiersTerritoireData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [activeScope, setActiveScope] = useState<Scope>(defaultScope);
  const [epciFilter, setEpciFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  // Filtres par colonne (multi-sélection, live).
  const [responsableFilter, setResponsableFilter] = useState<Set<string>>(new Set());
  const [etapeFilter, setEtapeFilter] = useState<Set<string>>(new Set());
  const [enAttenteFilter, setEnAttenteFilter] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      const result = await getDossiersTerritoireDataAction();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (e) {
      setError("Erreur lors du chargement des données");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Liste des EPCI distincts (avec leur nom lisible) fournie par le serveur.
  const availableEpcis = data?.epcisDisponibles ?? [];

  /**
   * Applique les filtres « non-scope » (recherche, EPCI, filtres par colonne).
   * Sert deux usages :
   *  - au passage de `activeScope` = scope sélectionné, calcule le `visible` paginé,
   *  - sans pré-filtre `canActAsResponsable`, calcule les compteurs contextuels
   *    de chaque tag (Mes/Tous), pour montrer combien de résultats il y aurait
   *    si on cliquait sur l'autre tag.
   */
  const applyNonScopeFilters = useCallback(
    (dossiers: DossierItem[]): DossierItem[] => {
      const byEpci = epciFilter ? dossiers.filter((d) => d.logement.codeEpci === epciFilter) : dossiers;
      const q = search.trim().toLowerCase();
      const bySearch = q
        ? byEpci.filter((d) => {
            const nom = `${d.particulier.prenom} ${d.particulier.nom}`.toLowerCase();
            const commune = d.logement.commune?.toLowerCase() ?? "";
            return nom.includes(q) || commune.includes(q);
          })
        : byEpci;
      const byResponsable =
        responsableFilter.size > 0
          ? bySearch.filter((d) => responsableFilter.has(getResponsableDisplayName(d.responsable)))
          : bySearch;
      const byEtape =
        etapeFilter.size > 0
          ? byResponsable.filter((d) => etapeFilter.has(getDossierStepLabel(d.currentStep, d.validation)))
          : byResponsable;
      return enAttenteFilter.size > 0 ? byEtape.filter((d) => enAttenteFilter.has(d.etat)) : byEtape;
    },
    [epciFilter, search, responsableFilter, etapeFilter, enAttenteFilter]
  );

  // Compteurs contextuels affichés dans les deux tags. Les deux suivent les
  // filtres locaux (recherche, EPCI, colonnes) ; seul le filtre `canActAsResponsable`
  // est appliqué/non-appliqué selon le tag.
  const scopeCounts = useMemo(() => {
    if (!data) return { mine: 0, all: 0 };
    const allFiltered = applyNonScopeFilters(data.dossiers);
    return {
      all: allFiltered.length,
      mine: allFiltered.filter((d) => d.canActAsResponsable).length,
    };
  }, [data, applyNonScopeFilters]);

  // Sous-ensemble effectivement listé : applique le scope choisi sur les
  // dossiers déjà filtrés (recherche / EPCI / colonnes).
  const visible = useMemo(() => {
    if (!data) return [];
    const filtered = applyNonScopeFilters(data.dossiers);
    const scoped = activeScope === "mine" ? filtered.filter((d) => d.canActAsResponsable) : filtered;
    // Tri par date de création (colonne « Création »).
    const sign = sortOrder === "asc" ? 1 : -1;
    return [...scoped].sort((a, b) => sign * (a.createdAt.getTime() - b.createdAt.getTime()));
  }, [data, applyNonScopeFilters, activeScope, sortOrder]);

  // Options de filtre par colonne : restreintes au sous-ensemble actuellement
  // visible (pour ne proposer que des valeurs présentes). Le filtre « En attente
  // de » est borné à une whitelist canonique (5 valeurs métier).
  const filterOptions = useMemo(() => {
    const responsables = new Set<string>();
    const etapes = new Set<string>();
    const etatsPresents = new Set<DossierEtat>();
    for (const d of visible) {
      const r = getResponsableDisplayName(d.responsable);
      if (r !== "—") responsables.add(r);
      etapes.add(getDossierStepLabel(d.currentStep, d.validation));
      etatsPresents.add(d.etat);
    }
    const toOptions = (values: Set<string>) =>
      Array.from(values)
        .sort((a, b) => a.localeCompare(b, "fr"))
        .map((v) => ({ value: v, label: v }));
    const toEtapeOptions = (values: Set<string>) =>
      Array.from(values)
        .sort((a, b) => ETAPE_LABEL_ORDER.indexOf(a) - ETAPE_LABEL_ORDER.indexOf(b))
        .map((v) => ({ value: v, label: v }));
    return {
      responsables: toOptions(responsables),
      etapes: toEtapeOptions(etapes),
      enAttente: EN_ATTENTE_FILTRABLES.filter((opt) => etatsPresents.has(opt.value)).map(
        ({ value, label }) => ({ value, label })
      ),
    };
  }, [visible]);

  // Compteurs KPI : 4 cartes (Pré-éligibilité AV / Demande AMO / Actions Ménages
  // / Instructions DDT) calculées sur TOUS les dossiers (indépendantes du scope
  // et des filtres locaux), pour donner une vue d'ensemble à l'agent.
  const counters: DossiersKpiCounters = useMemo(() => {
    const map: DossiersKpiCounters = { AV: 0, AMO: 0, MENAGE: 0, DDT: 0 };
    if (!data) return map;
    for (const d of data.dossiers) {
      switch (d.etat) {
        case "AV_QUALIFICATION":
          map.AV++;
          break;
        case "EN_ATTENTE_AMO":
          map.AMO++;
          break;
        case "MENAGE":
          map.MENAGE++;
          break;
        case "DDT":
          map.DDT++;
          break;
      }
    }
    return map;
  }, [data]);

  const paginated = visible.slice((page - 1) * pageSize, page * pageSize);

  const handleScopeChange = (next: Scope) => {
    setActiveScope(next);
    setPage(1);
  };

  // Bandeau « X résultat(s) dans vos/tous les dossiers » — affiché dès qu'un
  // filtre est actif (recherche, EPCI ou filtre par colonne). Le scope habille
  // le texte (« dans vos dossiers » vs « dans tous les dossiers ») et le lien
  // d'élargissement n'apparaît qu'en mode « Mes dossiers ».
  const hasActiveFilter =
    search.trim().length > 0 ||
    epciFilter !== "" ||
    responsableFilter.size > 0 ||
    etapeFilter.size > 0 ||
    enAttenteFilter.size > 0;
  const resultsLabel =
    activeScope === "mine"
      ? `${visible.length} résultat${visible.length > 1 ? "s" : ""} dans vos dossiers`
      : `${visible.length} résultat${visible.length > 1 ? "s" : ""} dans tous les dossiers`;

  if (isLoading) {
    return (
      <>
        <div className="fr-container fr-py-6w">
          <DossiersSuivisHeader prenom={prenom} />
        </div>
        <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
          <div className="fr-container">
            <p>Chargement...</p>
          </div>
        </section>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="fr-container fr-py-6w">
          <DossiersSuivisHeader prenom={prenom} />
        </div>
        <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
          <div className="fr-container">
            <div className="fr-alert fr-alert--error">
              <h3 className="fr-alert__title">Erreur</h3>
              <p>{error}</p>
            </div>
          </div>
        </section>
      </>
    );
  }

  if (!data) return null;

  return (
    <>
      <div className="fr-container fr-py-6w">
        <DossiersSuivisHeader prenom={prenom} />
        <DossiersKpiCards counters={counters} />
      </div>
      <section className="fr-container-fluid fr-py-8w bg-(--background-alt-blue-france)">
        <div className="fr-container">
          <h2 className="fr-h4 fr-mb-3w">Suivi des dossiers</h2>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <ul className="fr-tags-group fr-mb-0" aria-label="Filtrer les dossiers par responsabilité">
              <li>
                <button
                  type="button"
                  className="fr-tag"
                  aria-pressed={activeScope === "mine"}
                  onClick={() => handleScopeChange("mine")}>
                  Mes dossiers
                  <span className="fr-badge fr-badge--sm fr-ml-1v fr-badge--blue-cumulus">{scopeCounts.mine}</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="fr-tag"
                  aria-pressed={activeScope === "all"}
                  onClick={() => handleScopeChange("all")}>
                  Tous les dossiers
                  <span className="fr-badge fr-badge--sm fr-ml-1v fr-badge--blue-cumulus">{scopeCounts.all}</span>
                </button>
              </li>
            </ul>
            {canCreateDossier && (
              <Link
                href="/espace-agent/dossiers/nouveau?intent=amo"
                className="fr-btn fr-icon-add-line fr-btn--icon-left self-start md:self-auto whitespace-nowrap">
                Nouveau dossier
              </Link>
            )}
          </div>

          <div className="fr-grid-row fr-grid-row--gutters fr-mt-3w fr-mb-2w">
            <div className="fr-col-12 fr-col-md-6">
              <label className="fr-label sr-only" htmlFor="dossiers-search">
                Rechercher
              </label>
              <input
                className="fr-input"
                id="dossiers-search"
                type="search"
                placeholder="Rechercher (nom, commune...)"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path fill='%23161616' d='M18.031 16.617l4.283 4.282-1.415 1.415-4.282-4.283A8.96 8.96 0 0 1 11 20c-4.968 0-9-4.032-9-9s4.032-9 9-9 9 4.032 9 9a8.96 8.96 0 0 1-1.969 5.617zm-2.006-.742A6.977 6.977 0 0 0 18 11c0-3.867-3.133-7-7-7-3.867 0-7 3.133-7 7 0 3.867 3.133 7 7 7a6.977 6.977 0 0 0 4.875-1.975l.15-.15z'/></svg>\")",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "calc(100% - 0.75rem) 50%",
                  backgroundSize: "1rem 1rem",
                  paddingRight: "2.5rem",
                }}
              />
            </div>
            <div className="fr-col-12 fr-col-md-4">
              <label className="fr-label sr-only" htmlFor="dossiers-epci">
                EPCI
              </label>
              <select
                className="fr-select"
                id="dossiers-epci"
                value={epciFilter}
                onChange={(e) => {
                  setEpciFilter(e.target.value);
                  setPage(1);
                }}>
                <option value="">EPCI</option>
                {availableEpcis.map((epci) => (
                  <option key={epci.code} value={epci.code}>
                    {epci.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasActiveFilter && (
            <p className="fr-mb-2w">
              {resultsLabel}
              {activeScope === "mine" && (
                <>
                  {" "}
                  <button
                    type="button"
                    className="fr-link"
                    onClick={() => handleScopeChange("all")}>
                    Élargir la recherche à tous les dossiers
                  </button>
                </>
              )}
            </p>
          )}

          {visible.length === 0 ? (
            <div className="fr-alert fr-alert--info">
              <h3 className="fr-alert__title">Aucun dossier</h3>
              <p>Aucun dossier ne correspond à ces filtres.</p>
            </div>
          ) : (
            <>
              <DossiersSuivisTable
                dossiers={paginated}
                onRefresh={loadData}
                sortOrder={sortOrder}
                onToggleSort={() => setSortOrder((o) => (o === "asc" ? "desc" : "asc"))}
                responsableOptions={filterOptions.responsables}
                etapeOptions={filterOptions.etapes}
                enAttenteOptions={filterOptions.enAttente}
                responsableFilter={responsableFilter}
                etapeFilter={etapeFilter}
                enAttenteFilter={enAttenteFilter}
                onResponsableFilterChange={(next) => {
                  setResponsableFilter(next);
                  setPage(1);
                }}
                onEtapeFilterChange={(next) => {
                  setEtapeFilter(next);
                  setPage(1);
                }}
                onEnAttenteFilterChange={(next) => {
                  setEnAttenteFilter(next);
                  setPage(1);
                }}
              />
              <Pagination
                currentPage={page}
                totalItems={visible.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </>
          )}

          <div className="fr-callout fr-mt-4w">
            <h3 className="fr-callout__title">Le saviez-vous ?</h3>
            <p className="fr-callout__text">
              Un demandeur peut vous inviter à consulter et remplir ses formulaires. Les options d&apos;accès sont
              disponibles sur son compte{" "}
              <Link href="https://demarche.numerique.gouv.fr" target="_blank" rel="noopener noreferrer">
                demarche.numerique.gouv.fr
              </Link>{" "}
              (dans chaque formulaire).
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
