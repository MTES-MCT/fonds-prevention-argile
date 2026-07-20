"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  parseDossiersFilters,
  serializeDossiersFilters,
  type DossiersFiltersState,
  type Scope,
} from "./dossiers-filters-url";
import {
  getDossiersTerritoireDataAction,
  type DossiersTerritoireData,
} from "@/features/backoffice/espace-agent/dossiers/actions/get-dossiers-territoire-data.action";
import type { DossierItem } from "@/features/backoffice/espace-agent/dossiers/domain/types";
import { getDossierStepLabel, getResponsableDisplayName } from "@/features/backoffice/espace-agent/dossiers/domain";
import type { DossierEtat } from "@/features/parcours/core/domain/services/dossier-etat.service";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { DossiersSuivisHeader } from "./DossiersSuivisHeader";
import { DossiersSuivisTable } from "./DossiersSuivisTable";
import { DossiersKpiCards, type DossiersKpiCounters } from "./DossiersKpiCards";
import { Pagination } from "@/shared/components/Pagination/Pagination";

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
  { value: "AV_QUALIFICATION", label: "Aller-Vers" },
  { value: "EN_ATTENTE_AMO", label: "AMO" },
  { value: "MENAGE", label: "Ménage" },
  { value: "DDT", label: "DDT" },
  { value: "ARCHIVE", label: "Archivé" },
];

/**
 * Panel unifié des dossiers — tags Mes/Tous, filtre EPCI et recherche.
 */
export function DossiersPanel({ canCreateDossier = false, defaultScope = "all", prenom }: DossiersPanelProps) {
  const [data, setData] = useState<DossiersTerritoireData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Source de vérité unique : l'URL. Les filtres sont DÉRIVÉS de la query string
  // (pas de copie dans un useState), donc back/forward du navigateur les restaure
  // sans risque de désynchronisation état/URL.
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const filters = useMemo(
    () => parseDossiersFilters(new URLSearchParams(searchParams.toString()), defaultScope),
    [searchParams, defaultScope]
  );

  // Écrit un sous-ensemble de filtres dans l'URL via l'History API (replaceState) :
  // pas de refetch RSC, et une seule entrée d'historique pour la liste (« Précédent »
  // sort de la liste ; le bouton « Réinitialiser » vide les filtres). Next.js patche
  // replaceState pour mettre à jour `useSearchParams`, ce qui re-rend le composant.
  const setFilters = useCallback(
    (patch: Partial<DossiersFiltersState>) => {
      const qs = serializeDossiersFilters({ ...filters, ...patch }, defaultScope);
      window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
    },
    [filters, defaultScope, pathname]
  );

  // Alias en lecture pour garder le reste du composant lisible.
  const activeScope = filters.scope;
  const epciFilter = filters.epci;
  const sortOrder = filters.sort;
  const page = filters.page;
  const pageSize = filters.pageSize;
  const responsableFilter = filters.responsable;
  const etapeFilter = filters.etape;
  const enAttenteFilter = filters.enAttente;

  // Recherche : état local pour une saisie fluide et un filtrage instantané,
  // poussé vers l'URL en différé (debounce) et re-semé quand l'URL change depuis
  // l'extérieur (back/forward, réinitialisation).
  const [search, setSearch] = useState(filters.search);
  useEffect(() => {
    setSearch(filters.search);
  }, [filters.search]);
  useEffect(() => {
    if (search === filters.search) return;
    const timeout = setTimeout(() => setFilters({ search, page: 1 }), 300);
    return () => clearTimeout(timeout);
  }, [search, filters.search, setFilters]);

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
      enAttente: EN_ATTENTE_FILTRABLES.filter((opt) => etatsPresents.has(opt.value)).map(({ value, label }) => ({
        value,
        label,
      })),
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

  // Page bornée au nombre de pages réel : évite une page vide quand un filtre
  // (ou la recherche instantanée) réduit les résultats sous la page courante.
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleScopeChange = (next: Scope) => setFilters({ scope: next, page: 1 });

  // Réinitialise tous les filtres : on vide simplement la query string. Les
  // filtres dérivés repartent sur leurs valeurs par défaut, et le champ de
  // recherche local est re-semé par l'effet de synchro.
  const resetFilters = () => {
    window.history.replaceState(null, "", pathname);
    setSearch("");
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
          <div className="fpa-container-wide">
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
          <div className="fpa-container-wide">
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
        <div className="fpa-container-wide">
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
                onChange={(e) => setSearch(e.target.value)}
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
                onChange={(e) => setFilters({ epci: e.target.value, page: 1 })}>
                <option value="">EPCI</option>
                {availableEpcis.map((epci) => (
                  <option key={epci.code} value={epci.code}>
                    {epci.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(hasActiveFilter || activeScope !== defaultScope) && (
            <button
              type="button"
              className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-refresh-line fr-btn--icon-left fr-mb-2w"
              onClick={resetFilters}>
              Réinitialiser les filtres
            </button>
          )}

          {hasActiveFilter && (
            <p className="fr-mb-2w">
              {resultsLabel}
              {activeScope === "mine" && (
                <>
                  {" "}
                  <button type="button" className="fr-link" onClick={() => handleScopeChange("all")}>
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
                onToggleSort={() => setFilters({ sort: sortOrder === "asc" ? "desc" : "asc" })}
                responsableOptions={filterOptions.responsables}
                etapeOptions={filterOptions.etapes}
                enAttenteOptions={filterOptions.enAttente}
                responsableFilter={responsableFilter}
                etapeFilter={etapeFilter}
                enAttenteFilter={enAttenteFilter}
                onResponsableFilterChange={(next) => setFilters({ responsable: next, page: 1 })}
                onEtapeFilterChange={(next) => setFilters({ etape: next, page: 1 })}
                onEnAttenteFilterChange={(next) => setFilters({ enAttente: next, page: 1 })}
              />
              <Pagination
                currentPage={currentPage}
                totalItems={visible.length}
                pageSize={pageSize}
                onPageChange={(p) => setFilters({ page: p })}
                onPageSizeChange={(size) => setFilters({ pageSize: size, page: 1 })}
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
