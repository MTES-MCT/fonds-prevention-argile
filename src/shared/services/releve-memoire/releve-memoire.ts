const MO = 1024 * 1024;
const NB_APPELANTS = 2;
const NB_RESSOURCES = 4;

export const SITE_INTERNE = "(interne Node)";

export interface MemoireConteneur {
  total: number | null;
  anon: number;
  cache: number;
  swap: number | null;
}

/** Compteurs cumulés depuis la création du conteneur : c'est leur hausse d'un relevé à l'autre qui compte. */
export interface PressionMemoire {
  limiteAtteinte: number | null;
  swapRefuse: number | null;
  tues: number | null;
  ralentiSecondes: number | null;
  bloqueSecondes: number | null;
}

export interface MemoireHote {
  disponible: number;
  swapLibre: number;
}

export interface Releve {
  dureeSecondes: number;
  conteneur: MemoireConteneur | null;
  pression: PressionMemoire | null;
  hote: MemoireHote | null;
  rss: number;
  rssAnonyme: number | null;
  enSwap: number | null;
  tasUtilise: number;
  tasTotal: number;
  externe: number;
  buffers: number;
  espaces: { vieux: number; grands: number; code: number };
  ressources: string[];
}

export interface CadreAllocation {
  functionName: string;
  url: string;
  lineNumber: number;
  columnNumber: number;
}

export interface NoeudAllocation {
  callFrame: CadreAllocation;
  selfSize: number;
  children?: NoeudAllocation[];
}

export interface SiteAllocation {
  octets: number;
  site: string;
  appelants: string[];
}

export interface ResumeAllocations {
  total: number;
  sites: SiteAllocation[];
}

export interface SiteClasse extends SiteAllocation {
  croissance: number | null;
}

function lireCompteur(contenu: string, cle: string): number | null {
  const ligne = contenu.split("\n").find((l) => l.startsWith(`${cle} `));
  const valeur = ligne ? Number(ligne.slice(cle.length + 1).trim()) : NaN;
  return Number.isFinite(valeur) ? valeur : null;
}

function lireNombre(contenu: string | null): number | null {
  const valeur = contenu === null ? NaN : Number(contenu.trim());
  return Number.isFinite(valeur) ? valeur : null;
}

/** Lit `memory.stat` (cgroup v2) : `scalingo stats` affiche le total, cache compris, seul anon pèse vraiment. */
export function lireMemoireConteneur(
  memoryStat: string | null,
  swapCurrent: string | null,
  memoryCurrent: string | null = null
): MemoireConteneur | null {
  if (!memoryStat) return null;
  const anon = lireCompteur(memoryStat, "anon");
  const cache = lireCompteur(memoryStat, "file");
  if (anon === null || cache === null) return null;
  return { total: lireNombre(memoryCurrent), anon, cache, swap: lireNombre(swapCurrent) };
}

// `memory.pressure` : temps cumulé, en microsecondes, où des tâches ont attendu de la mémoire.
function lireAttenteSecondes(memoryPressure: string | null, portee: "some" | "full"): number | null {
  const micro = memoryPressure?.match(new RegExp(`^${portee} .*total=(\\d+)$`, "m"))?.[1];
  return micro ? Number(micro) / 1_000_000 : null;
}

/** Dit si le conteneur a buté sur ses propres limites (`memory.events`) et si ses tâches ont attendu de la mémoire. */
export function lirePressionMemoire(
  memoryEvents: string | null,
  swapEvents: string | null,
  memoryPressure: string | null
): PressionMemoire | null {
  const pression: PressionMemoire = {
    limiteAtteinte: memoryEvents ? lireCompteur(memoryEvents, "max") : null,
    swapRefuse: swapEvents ? lireCompteur(swapEvents, "max") : null,
    tues: memoryEvents ? lireCompteur(memoryEvents, "oom_kill") : null,
    ralentiSecondes: lireAttenteSecondes(memoryPressure, "some"),
    bloqueSecondes: lireAttenteSecondes(memoryPressure, "full"),
  };
  return Object.values(pression).every((valeur) => valeur === null) ? null : pression;
}

// Le noyau exprime ces champs en kB.
function lireChampKilo(contenu: string | null, champ: string): number | null {
  const kilo = contenu?.match(new RegExp(`^${champ}:\\s+(\\d+) kB$`, "m"))?.[1];
  return kilo ? Number(kilo) * 1024 : null;
}

/** Lit `RssAnon` dans `/proc/self/status` : la mémoire du processus présente en RAM. */
export function lireRssAnonyme(procStatus: string | null): number | null {
  return lireChampKilo(procStatus, "RssAnon");
}

/** Lit `VmSwap` dans `/proc/self/status` : la mémoire du processus partie en swap. */
export function lireEnSwap(procStatus: string | null): number | null {
  return lireChampKilo(procStatus, "VmSwap");
}

/** `/proc/meminfo` décrit la machine hôte, pas le conteneur : c'est elle qui pousse en swap quand elle manque de RAM. */
export function lireMemoireHote(meminfo: string | null): MemoireHote | null {
  const disponible = lireChampKilo(meminfo, "MemAvailable");
  const swapLibre = lireChampKilo(meminfo, "SwapFree");
  return disponible === null || swapLibre === null ? null : { disponible, swapLibre };
}

export function compterRessources(types: string[]): [string, number][] {
  const parType = new Map<string, number>();
  for (const type of types) parType.set(type, (parType.get(type) ?? 0) + 1);
  return [...parType].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, NB_RESSOURCES);
}

export function formaterDuree(secondes: number): string {
  const minutes = Math.floor(secondes / 60);
  const heures = Math.floor(minutes / 60);
  const deuxChiffres = (n: number) => String(n).padStart(2, "0");
  if (heures >= 24) return `${Math.floor(heures / 24)}j${deuxChiffres(heures % 24)}h`;
  if (heures >= 1) return `${heures}h${deuxChiffres(minutes % 60)}`;
  return `${minutes}min`;
}

const enMo = (octets: number) => Math.round(octets / MO);

function formaterPression(pression: PressionMemoire): string {
  const champs: [string, string | number | null][] = [
    ["limite", pression.limiteAtteinte],
    ["swapRefuse", pression.swapRefuse],
    ["tues", pression.tues],
    ["ralenti", pression.ralentiSecondes === null ? null : `${pression.ralentiSecondes.toFixed(1)}s`],
    ["bloque", pression.bloqueSecondes === null ? null : `${pression.bloqueSecondes.toFixed(1)}s`],
  ];
  return champs
    .filter(([, valeur]) => valeur !== null)
    .map(([nom, valeur]) => `${nom}=${valeur}`)
    .join(" ");
}

/** Une ligne par relevé, toutes les valeurs en Mo : la colonne qui monte d'un relevé à l'autre désigne la cause. */
export function formaterReleve(releve: Releve): string {
  const { conteneur, pression, hote, rssAnonyme, enSwap, espaces } = releve;
  const blocs = [`actif=${formaterDuree(releve.dureeSecondes)}`];

  if (conteneur) {
    const total = conteneur.total === null ? "" : `total=${enMo(conteneur.total)} `;
    const swap = conteneur.swap === null ? "?" : enMo(conteneur.swap);
    blocs.push(`conteneur ${total}anon=${enMo(conteneur.anon)} cache=${enMo(conteneur.cache)} swap=${swap}`);
  }
  if (pression) blocs.push(`pression ${formaterPression(pression)}`);
  if (hote) blocs.push(`hote dispo=${enMo(hote.disponible)} swapLibre=${enMo(hote.swapLibre)}`);

  // Une page partie en swap reste au processus : sans elle, horsTas tombait à 0 dès que le swap se remplissait.
  const horsTas =
    rssAnonyme === null ? "" : ` horsTas=${enMo(Math.max(0, rssAnonyme + (enSwap ?? 0) - releve.tasTotal))}`;
  const swapProcessus = enSwap === null ? "" : ` enSwap=${enMo(enSwap)}`;
  blocs.push(
    `processus rss=${enMo(releve.rss)}${swapProcessus} tas=${enMo(releve.tasUtilise)}/${enMo(releve.tasTotal)}` +
      `${horsTas} externe=${enMo(releve.externe)} buffers=${enMo(releve.buffers)}`
  );
  blocs.push(`tas vieux=${enMo(espaces.vieux)} grands=${enMo(espaces.grands)} code=${enMo(espaces.code)}`);

  const ressources = compterRessources(releve.ressources);
  if (ressources.length > 0) blocs.push(`ressources ${ressources.map(([type, nb]) => `${type}=${nb}`).join(" ")}`);

  return `[memoire] ${blocs.join(" | ")}`;
}

function raccourcirChemin(url: string, racineProjet: string): string {
  return url
    .replace(/^file:\/\//, "")
    .replace(`${racineProjet}/`, "")
    .replace(/^.*node_modules\//, "nm/")
    .replace(/^\.next\/server\//, "");
}

// Un cadre sans script (natif) ou interne à Node ne désigne aucun code à corriger.
function libelleCadre(cadre: CadreAllocation, racineProjet: string): string | null {
  if (!cadre.url || cadre.url.startsWith("node:")) return null;
  const position = `${raccourcirChemin(cadre.url, racineProjet)}:${cadre.lineNumber + 1}:${cadre.columnNumber + 1}`;
  return `${cadre.functionName || "(anonyme)"} (${position})`;
}

/** Regroupe les objets encore vivants par fonction applicative la plus proche dans la pile d'allocation. */
export function resumerAllocations(racine: NoeudAllocation, racineProjet: string): ResumeAllocations {
  const parSite = new Map<string, { octets: number; plusGros: number; appelants: string[] }>();
  const pile: string[] = [];
  let total = 0;

  const visiter = (noeud: NoeudAllocation) => {
    const libelle = libelleCadre(noeud.callFrame, racineProjet);
    if (libelle) pile.push(libelle);

    if (noeud.selfSize > 0) {
      total += noeud.selfSize;
      const site = pile.at(-1) ?? SITE_INTERNE;
      const cumul = parSite.get(site) ?? { octets: 0, plusGros: 0, appelants: [] };
      cumul.octets += noeud.selfSize;
      if (noeud.selfSize > cumul.plusGros) {
        cumul.plusGros = noeud.selfSize;
        cumul.appelants = pile.slice(0, -1).slice(-NB_APPELANTS).reverse();
      }
      parSite.set(site, cumul);
    }

    for (const enfant of noeud.children ?? []) visiter(enfant);
    if (libelle) pile.pop();
  };
  visiter(racine);

  const sites = [...parSite]
    .map(([site, { octets, appelants }]) => ({ site, octets, appelants }))
    .sort((a, b) => b.octets - a.octets);
  return { total, sites };
}

export function indexerParSite(sites: SiteAllocation[]): Map<string, number> {
  return new Map(sites.map(({ site, octets }) => [site, octets]));
}

/** Avec une référence, classe par croissance : le chargement initial, gros mais stable, ne masque plus une fuite. */
export function classerAllocations(
  sites: SiteAllocation[],
  reference: Map<string, number> | null,
  max: number
): SiteClasse[] {
  const classes = sites.map((site) => ({
    ...site,
    croissance: reference ? site.octets - (reference.get(site.site) ?? 0) : null,
  }));
  return classes.sort((a, b) => (b.croissance ?? 0) - (a.croissance ?? 0) || b.octets - a.octets).slice(0, max);
}

export function formaterAllocations(total: number, sites: SiteClasse[]): string[] {
  const unDecimale = (octets: number) => (octets / MO).toFixed(1);
  const signe = (octets: number) => (octets < 0 ? "-" : "+") + unDecimale(Math.abs(octets));
  const parCroissance = sites.some((site) => site.croissance !== null);

  const lignes = [
    `[memoire] allocations vivantes échantillonnées : ${unDecimale(total)} Mo` +
      (parCroissance ? ", sites classés par croissance depuis le premier relevé" : ", sites classés par taille"),
  ];
  sites.forEach(({ octets, croissance, site, appelants }, index) => {
    const taille =
      croissance === null ? `${unDecimale(octets)} Mo` : `${signe(croissance)} Mo (${unDecimale(octets)} Mo)`;
    lignes.push(`[memoire] alloc ${index + 1}/${sites.length} ${taille} ${[site, ...appelants].join(" < ")}`);
  });
  return lignes;
}
