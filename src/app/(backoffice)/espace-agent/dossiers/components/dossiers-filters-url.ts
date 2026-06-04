/**
 * (Dé)sérialisation des filtres du suivi des dossiers vers/depuis l'URL.
 *
 * Permet de persister l'état de filtrage dans la query string : l'agent peut
 * filtrer, ouvrir un dossier, puis revenir (bouton « Précédent ») sans perdre
 * ses filtres. La vue filtrée devient aussi partageable / bookmarkable.
 *
 * Fonctions pures (pas de dépendance React/DOM) pour rester testables. Les clés
 * d'URL sont volontairement courtes (`q`, `epci`, `resp`...) ; les valeurs par
 * défaut ne sont PAS écrites pour garder l'URL propre.
 */

export type Scope = "mine" | "all";

export interface DossiersFiltersState {
  scope: Scope;
  search: string;
  epci: string;
  sort: "asc" | "desc";
  page: number;
  pageSize: number;
  responsable: Set<string>;
  etape: Set<string>;
  enAttente: Set<string>;
}

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 50, 100];

/**
 * Reconstruit l'état des filtres depuis la query string. Toute valeur absente
 * ou invalide retombe sur son défaut (`defaultScope` dépend du rôle de l'agent).
 */
export function parseDossiersFilters(params: URLSearchParams, defaultScope: Scope): DossiersFiltersState {
  const scopeParam = params.get("scope");
  const scope: Scope = scopeParam === "mine" || scopeParam === "all" ? scopeParam : defaultScope;

  const pageParam = Number(params.get("page"));
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1;

  const sizeParam = Number(params.get("size"));
  const pageSize = PAGE_SIZE_OPTIONS.includes(sizeParam) ? sizeParam : DEFAULT_PAGE_SIZE;

  return {
    scope,
    search: params.get("q") ?? "",
    epci: params.get("epci") ?? "",
    sort: params.get("sort") === "asc" ? "asc" : "desc",
    page,
    pageSize,
    responsable: new Set(params.getAll("resp")),
    etape: new Set(params.getAll("etape")),
    enAttente: new Set(params.getAll("attente")),
  };
}

/**
 * Sérialise l'état des filtres en query string (sans le `?` initial). Les valeurs
 * par défaut sont omises ; les filtres multi-valeurs (Set) sont écrits en clés
 * répétées (`resp=A&resp=B`) pour éviter tout souci de séparateur dans les noms.
 */
export function serializeDossiersFilters(state: DossiersFiltersState, defaultScope: Scope): string {
  const params = new URLSearchParams();

  if (state.scope !== defaultScope) params.set("scope", state.scope);
  if (state.search.trim()) params.set("q", state.search);
  if (state.epci) params.set("epci", state.epci);
  if (state.sort !== "desc") params.set("sort", state.sort);
  if (state.page > 1) params.set("page", String(state.page));
  if (state.pageSize !== DEFAULT_PAGE_SIZE) params.set("size", String(state.pageSize));

  for (const v of state.responsable) params.append("resp", v);
  for (const v of state.etape) params.append("etape", v);
  for (const v of state.enAttente) params.append("attente", v);

  return params.toString();
}
