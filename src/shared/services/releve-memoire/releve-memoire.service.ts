import { readFile } from "node:fs/promises";
import v8 from "node:v8";
import { getServerEnv } from "@/shared/config/env.config";
import {
  classerAllocations,
  formaterAllocations,
  formaterReleve,
  indexerParSite,
  lireEnSwap,
  lireMemoireConteneur,
  lireMemoireHote,
  lirePressionMemoire,
  lireRssAnonyme,
  resumerAllocations,
  type Releve,
} from "./releve-memoire";

type SessionInspecteur = import("node:inspector/promises").Session;

const DELAI_PREMIER_RELEVE_MS = 60_000;
// 128 Kio entre deux échantillons : coût négligeable, et une fuite de quelques Mo reste visible.
const PAS_ECHANTILLONNAGE_OCTETS = 128 * 1024;

const messageErreur = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function lireFichier(chemin: string): Promise<string | null> {
  try {
    return await readFile(chemin, "utf8");
  } catch {
    return null;
  }
}

async function construireReleve(): Promise<Releve> {
  const cgroup = (fichier: string) => lireFichier(`/sys/fs/cgroup/${fichier}`);
  const [memoryStat, swapCurrent, memoryCurrent, memoryEvents, swapEvents, memoryPressure, procStatus, meminfo] =
    await Promise.all([
      cgroup("memory.stat"),
      cgroup("memory.swap.current"),
      cgroup("memory.current"),
      cgroup("memory.events"),
      cgroup("memory.swap.events"),
      cgroup("memory.pressure"),
      lireFichier("/proc/self/status"),
      lireFichier("/proc/meminfo"),
    ]);
  const memoire = process.memoryUsage();
  const espaces = new Map(v8.getHeapSpaceStatistics().map((e) => [e.space_name, e.space_used_size]));

  return {
    dureeSecondes: process.uptime(),
    conteneur: lireMemoireConteneur(memoryStat, swapCurrent, memoryCurrent),
    pression: lirePressionMemoire(memoryEvents, swapEvents, memoryPressure),
    hote: lireMemoireHote(meminfo),
    rss: memoire.rss,
    rssAnonyme: lireRssAnonyme(procStatus),
    enSwap: lireEnSwap(procStatus),
    tasUtilise: memoire.heapUsed,
    tasTotal: memoire.heapTotal,
    externe: memoire.external,
    buffers: memoire.arrayBuffers,
    espaces: {
      vieux: espaces.get("old_space") ?? 0,
      grands: espaces.get("large_object_space") ?? 0,
      code: (espaces.get("code_space") ?? 0) + (espaces.get("trusted_space") ?? 0),
    },
    ressources: process.getActiveResourcesInfo(),
  };
}

async function ouvrirEchantillonnage(): Promise<SessionInspecteur | null> {
  try {
    const { Session } = await import("node:inspector/promises");
    const session = new Session();
    session.connect();
    await session.post("HeapProfiler.enable");
    await session.post("HeapProfiler.startSampling", { samplingInterval: PAS_ECHANTILLONNAGE_OCTETS });
    return session;
  } catch (error) {
    console.warn(`[memoire] échantillonnage des allocations indisponible : ${messageErreur(error)}`);
    return null;
  }
}

interface Echantillonnage {
  session: SessionInspecteur;
  nbSites: number;
  reference: Map<string, number> | null;
}

async function relever(echantillonnage: Echantillonnage | null): Promise<void> {
  console.log(formaterReleve(await construireReleve()));
  if (!echantillonnage) return;

  const { profile } = await echantillonnage.session.post("HeapProfiler.getSamplingProfile");
  const { total, sites } = resumerAllocations(profile.head, process.cwd());
  const classes = classerAllocations(sites, echantillonnage.reference, echantillonnage.nbSites);
  for (const ligne of formaterAllocations(total, classes)) console.log(ligne);
  echantillonnage.reference ??= indexerParSite(sites);
}

/** Inactif tant que `MEMORY_LOG_INTERVAL_MINUTES` n'est pas posée ; ne doit jamais empêcher le serveur de démarrer. */
export async function demarrerReleveMemoire(): Promise<void> {
  let intervalleMinutes: number | undefined;
  let nbSites = 0;
  try {
    const env = getServerEnv();
    intervalleMinutes = env.MEMORY_LOG_INTERVAL_MINUTES;
    nbSites = env.MEMORY_LOG_TOP_ALLOCATIONS ?? 0;
  } catch {
    return;
  }
  if (!intervalleMinutes) return;

  const session = nbSites > 0 ? await ouvrirEchantillonnage() : null;
  const echantillonnage: Echantillonnage | null = session ? { session, nbSites, reference: null } : null;
  const tick = () => {
    relever(echantillonnage).catch((error: unknown) => {
      console.warn(`[memoire] relevé impossible : ${messageErreur(error)}`);
    });
  };

  // unref : le relevé ne doit pas retenir le processus à l'arrêt.
  const intervalleMs = intervalleMinutes * 60_000;
  if (intervalleMs > DELAI_PREMIER_RELEVE_MS) setTimeout(tick, DELAI_PREMIER_RELEVE_MS).unref();
  setInterval(tick, intervalleMs).unref();
  console.log(
    `[memoire] relevé toutes les ${intervalleMinutes} min` +
      (session ? `, ${nbSites} premiers sites d'allocation` : ", sans sites d'allocation")
  );
}
