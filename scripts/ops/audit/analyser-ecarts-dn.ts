/**
 * Explique l'écart entre les compteurs d'une démarche DN et ceux de `/stats` (déposés, validés),
 * dossier par dossier : ce que DN compte et pas nous, ce que nous comptons et que DN ne liste
 * plus, et les dossiers connus des deux côtés dans des états différents.
 *
 * LECTURE SEULE, des deux côtés : aucune écriture en base (contrairement à `ds:reconcilier`, qui
 * alimente la file d'observations même en dry-run), aucune mutation DN.
 *
 * Données DN lues : numéro, état, archivage, préremplissage, date de traitement et annotations
 * privées. Seul le lien FPA (un `parcoursId`) est exploité, les autres annotations ne sont ni
 * conservées ni affichées. Aucune donnée d'usager ni champ du formulaire.
 *
 * Usage :
 *   pnpm ds:analyser-ecarts                       # éligibilité, numéros anonymisés, 10 par catégorie
 *   pnpm ds:analyser-ecarts --detail              # toutes les listes en entier
 *   pnpm ds:analyser-ecarts --no-anonymize        # numéros DN en clair, pour agir dessus
 *   pnpm ds:analyser-ecarts --step=diagnostic     # autre démarche
 *
 * Prérequis : DATABASE_URL + DEMARCHES_SIMPLIFIEES_GRAPHQL_API_* + DEMARCHES_SIMPLIFIEES_ID_*.
 * Sur Scalingo : dans un one-off, les variables sont déjà injectées.
 */

import { and, eq, inArray, isNotNull } from "drizzle-orm";
// `createOpsDb` charge dotenv : à importer avant tout module qui lit l'environnement.
import { createOpsDb } from "../lib/db";
import { dsQuery, DEMARCHE_IDS, type DsGraphqlResult } from "../lib/ds-graphql";
import { createRedactor } from "../lib/anonymize";
import { getArg, hasFlag } from "../lib/args";
import { getErrorByParcours, sleep } from "../sync-erreurs/_shared";
import {
  analyserEcarts,
  fenetreValides,
  LIBELLES_ABSENCE_VALIDE,
  LIBELLES_CAUSE,
  LIBELLES_PERIMETRE,
  type CauseDivergence,
  type DossierDn,
  type DossierSupprimeDn,
  type EtatDn,
  type Perimetre,
} from "./ecarts-dn";
import { dossiersDemarchesSimplifiees, dossiersDsTentatives, parcoursPrevention } from "@/shared/database/schema";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { lireAnnotationFpa } from "@/features/parcours/dossiers-ds/utils/annotation-fpa.utils";
import { getAnnotationLienFpaId } from "@/features/parcours/dossiers-ds/domain/value-objects/ds-annotations";
import type { AnnotationReconciliation } from "@/features/parcours/dossiers-ds/adapters/graphql/types";
import { SERVICE_START_DATE } from "@/features/backoffice/administration/tableau-de-bord/domain/types/tableau-de-bord.types";

const STEPS_DN = [Step.ELIGIBILITE, Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES];
const STEP = (getArg("step") ?? Step.ELIGIBILITE) as Step;
const DETAIL = hasFlag("detail");
const ANONYMIZE = !hasFlag("no-anonymize");
const MAX_PAGES = 200;
const PAUSE_MS = 150;
const APERCU = 10;

const { redactDsNumber } = createRedactor(ANONYMIZE);

interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

interface Connexion<T> {
  pageInfo: PageInfo;
  nodes: T[];
}

type ReponsePaginee<T> = { demarche: Record<string, Connexion<T>> | null };

interface NoeudDossier {
  number: number;
  state: EtatDn;
  archived: boolean;
  prefilled: boolean | null;
  dateTraitement: string | null;
  annotations: AnnotationReconciliation[] | null;
}

interface NoeudSupprime {
  number: number;
  reason: string | null;
}

const QUERY_DOSSIERS = `
  query EcartsDossiers($n: Int!, $after: String) {
    demarche(number: $n) {
      dossiers(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes {
          number state archived prefilled dateTraitement
          annotations { champDescriptorId stringValue prefilledValueModified }
        }
      }
    }
  }
`;

const queryDossiersSupprimes = (connexion: "deletedDossiers" | "pendingDeletedDossiers") => `
  query EcartsSupprimes($n: Int!, $after: String) {
    demarche(number: $n) {
      ${connexion}(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes { number reason }
      }
    }
  }
`;

/** Parcourt une connexion paginée de la démarche. Lève sur tout échec : un scan partiel fausserait le bilan. */
async function paginer<T>(query: string, connexion: string, demarcheNumber: number): Promise<T[]> {
  const noeuds: T[] = [];
  let after: string | null = null;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const r: DsGraphqlResult<ReponsePaginee<T>> = await dsQuery<ReponsePaginee<T>>(query, { n: demarcheNumber, after });
    const conn: Connexion<T> | undefined = r.data?.demarche?.[connexion];
    if (!conn) {
      const cause = r.httpError ?? r.errors?.map((e) => e.extensions?.code ?? e.message).join(", ") ?? "réponse vide";
      throw new Error(`${connexion}, page ${page} : ${cause}`);
    }
    noeuds.push(...conn.nodes);
    if (!conn.pageInfo.hasNextPage) return noeuds;
    after = conn.pageInfo.endCursor;
    if (!after) throw new Error(`${connexion}, page ${page} : curseur absent alors qu'il reste des pages`);
    await sleep(PAUSE_MS);
  }
  throw new Error(`${connexion} : plafond de ${MAX_PAGES} pages atteint`);
}

async function collecterDn(demarcheNumber: number): Promise<DossierDn[]> {
  const descripteur = getAnnotationLienFpaId(STEP, demarcheNumber);
  const noeuds = await paginer<NoeudDossier>(QUERY_DOSSIERS, "dossiers", demarcheNumber);

  return noeuds.map((n) => {
    const lien = lireAnnotationFpa(n.annotations, descripteur);
    return {
      numero: String(n.number),
      etat: n.state,
      archive: n.archived,
      prerempli: !!n.prefilled,
      dateTraitement: n.dateTraitement ? new Date(n.dateTraitement) : null,
      parcoursIdAnnote: lien.parcoursId,
      annotationDouteuse: lien.ambigue || lien.modifiee,
    };
  });
}

/** Best-effort : sans ces listes, un fantôme reste « introuvable » au lieu d'être daté et motivé. */
async function collecterSupprimes(demarcheNumber: number): Promise<DossierSupprimeDn[] | null> {
  try {
    const [supprimes, corbeille] = await Promise.all([
      paginer<NoeudSupprime>(queryDossiersSupprimes("deletedDossiers"), "deletedDossiers", demarcheNumber),
      paginer<NoeudSupprime>(
        queryDossiersSupprimes("pendingDeletedDossiers"),
        "pendingDeletedDossiers",
        demarcheNumber
      ),
    ]);
    return [
      ...supprimes.map((s) => ({ numero: String(s.number), raison: s.reason ?? "inconnue", enCorbeille: false })),
      ...corbeille.map((s) => ({ numero: String(s.number), raison: s.reason ?? "inconnue", enCorbeille: true })),
    ];
  } catch (error) {
    console.warn(`Dossiers supprimés indisponibles : ${error instanceof Error ? error.message : error}`);
    return null;
  }
}

function formaterNumeros(numeros: string[]): string {
  const visibles = DETAIL ? numeros : numeros.slice(0, APERCU);
  const reste = numeros.length - visibles.length;
  return visibles.map((n) => redactDsNumber(n)).join(", ") + (reste > 0 ? ` … (+${reste}, --detail)` : "");
}

function ligne(nombre: number, libelle: string, numeros: string[] = []) {
  console.log(`  ${String(nombre).padStart(5)}  ${libelle}`);
  if (numeros.length > 0) console.log(`         ${formaterNumeros(numeros)}`);
}

function jour(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "—";
}

async function main() {
  if (!STEPS_DN.includes(STEP)) {
    console.error(`--step invalide : "${STEP}" (attendu : ${STEPS_DN.join(", ")})`);
    process.exit(1);
  }
  const demarcheNumber = Number(DEMARCHE_IDS[STEP]);
  if (!Number.isInteger(demarcheNumber) || demarcheNumber <= 0) {
    console.error(`DEMARCHES_SIMPLIFIEES_ID_${STEP.toUpperCase()} manquant ou invalide`);
    process.exit(1);
  }

  const { db, client } = createOpsDb();
  const maintenant = new Date();

  try {
    const [dn, supprimes, pointeursBruts, tentatives, erreurs] = await Promise.all([
      collecterDn(demarcheNumber),
      collecterSupprimes(demarcheNumber),
      db
        .select({
          numero: dossiersDemarchesSimplifiees.dsNumber,
          parcoursId: dossiersDemarchesSimplifiees.parcoursId,
          dsStatus: dossiersDemarchesSimplifiees.dsStatus,
          submittedAt: dossiersDemarchesSimplifiees.submittedAt,
          processedAt: dossiersDemarchesSimplifiees.processedAt,
          lastSyncAt: dossiersDemarchesSimplifiees.lastSyncAt,
          archivedAt: parcoursPrevention.archivedAt,
          completedAt: parcoursPrevention.completedAt,
        })
        .from(dossiersDemarchesSimplifiees)
        .innerJoin(parcoursPrevention, eq(parcoursPrevention.id, dossiersDemarchesSimplifiees.parcoursId))
        .where(and(eq(dossiersDemarchesSimplifiees.step, STEP), isNotNull(dossiersDemarchesSimplifiees.dsNumber))),
      db
        .select({ numero: dossiersDsTentatives.dsNumber, parcoursId: dossiersDsTentatives.parcoursId })
        .from(dossiersDsTentatives)
        .where(eq(dossiersDsTentatives.step, STEP)),
      getErrorByParcours(db),
    ]);

    const annotes = [...new Set(dn.map((d) => d.parcoursIdAnnote).filter((id): id is string => !!id))];
    const existants = new Set<string>();
    for (let i = 0; i < annotes.length; i += 500) {
      const lot = await db
        .select({ id: parcoursPrevention.id })
        .from(parcoursPrevention)
        .where(inArray(parcoursPrevention.id, annotes.slice(i, i + 500)));
      lot.forEach((p) => existants.add(p.id));
    }

    const r = analyserEcarts({
      dn,
      supprimes: supprimes ?? [],
      pointeurs: pointeursBruts.map((p) => ({
        numero: p.numero as string,
        parcoursId: p.parcoursId,
        dsStatus: p.dsStatus,
        submittedAt: p.submittedAt,
        processedAt: p.processedAt,
        lastSyncAt: p.lastSyncAt,
        parcoursArchive: !!p.archivedAt,
        parcoursComplete: !!p.completedAt,
        syncEnErreur: erreurs.has(p.parcoursId),
      })),
      tentatives,
      parcoursExistants: existants,
      maintenant,
      debutService: SERVICE_START_DATE,
    });
    const fenetre = fenetreValides(maintenant, SERVICE_START_DATE);

    console.log("=".repeat(76));
    console.log(`ANALYSE DES ÉCARTS DN / STATS — LECTURE SEULE${ANONYMIZE ? " (numéros anonymisés)" : ""}`);
    console.log("=".repeat(76));
    console.log(`Étape ${STEP} — démarche ${demarcheNumber} — ${maintenant.toISOString().slice(0, 16)} UTC`);
    console.log(
      `Graphique des validés de /stats : ${jour(fenetre.debut)} → ${jour(new Date(fenetre.fin.getTime() - 1))}`
    );
    console.log();

    console.log("1. TOTAUX");
    console.log(`  ${"".padEnd(34)}${"DN".padStart(6)}${"base".padStart(8)}`);
    console.log(
      `  ${"Déposés (carte /stats)".padEnd(34)}${String(r.dn.total).padStart(6)}${String(r.base.deposes).padStart(8)}`
    );
    console.log(
      `  ${"Acceptés (graphique /stats)".padEnd(34)}${String(r.valides.acceptesDn).padStart(6)}${String(r.base.valides).padStart(8)}`
    );
    console.log(`  Acceptés en base, toutes dates : ${r.base.acceptes}`);
    console.log(
      `  DN par état : ${Object.entries(r.dn.parEtat)
        .map(([etat, n]) => `${etat} ${n}`)
        .join(" · ")}`
    );
    console.log(`  Dont archivés côté DN (hors onglet « Tous ») : ${r.dn.archives}`);
    console.log();

    const nonComptes = (Object.keys(LIBELLES_PERIMETRE) as Perimetre[]).filter(
      (p) => p !== "compte" && r.deposes.parPerimetre[p].length > 0
    );
    const totalNonComptes = nonComptes.reduce((s, p) => s + r.deposes.parPerimetre[p].length, 0);
    console.log(
      `2. DÉPOSÉS : DN ${r.dn.total} = base ${r.base.deposes} − ${r.deposes.fantomes.length} fantôme(s) + ${totalNonComptes} non compté(s)`
    );
    console.log("  Déposés dans DN, absents de la carte /stats :");
    if (nonComptes.length === 0) console.log("      aucun");
    for (const p of nonComptes)
      ligne(r.deposes.parPerimetre[p].length, LIBELLES_PERIMETRE[p], r.deposes.parPerimetre[p]);
    console.log("  Comptés par /stats, absents de la liste DN :");
    if (r.deposes.fantomes.length === 0) console.log("      aucun");
    if (supprimes === null && r.deposes.fantomes.length > 0)
      console.log("      (raisons de suppression indisponibles)");
    const fantomesParCause = new Map<string, string[]>();
    for (const f of r.deposes.fantomes) {
      const cle =
        f.cause === "introuvable"
          ? "introuvable dans DN"
          : `${f.cause === "corbeille_dn" ? "dans la corbeille DN" : "supprimé dans DN"} (${f.raison})`;
      fantomesParCause.set(cle, [...(fantomesParCause.get(cle) ?? []), f.numero]);
    }
    for (const [cle, numeros] of fantomesParCause) ligne(numeros.length, cle, numeros);
    console.log();

    const totalAbsents = Object.values(r.valides.absents).reduce((s, l) => s + l.length, 0);
    console.log(
      `3. VALIDÉS : DN ${r.valides.acceptesDn} = graphique ${r.base.valides} − ${r.valides.enTrop.length} en trop + ${totalAbsents} absent(s)`
    );
    console.log("  Acceptés dans DN, absents du graphique :");
    if (totalAbsents === 0) console.log("      aucun");
    for (const [cle, numeros] of Object.entries(r.valides.absents)) {
      if (numeros.length > 0)
        ligne(numeros.length, LIBELLES_ABSENCE_VALIDE[cle as keyof typeof LIBELLES_ABSENCE_VALIDE], numeros);
    }
    if (r.valides.enTrop.length > 0) {
      console.log("  Dans le graphique, mais pas « accepté » dans DN :");
      ligne(r.valides.enTrop.length, "à vérifier", r.valides.enTrop);
    }
    console.log();

    console.log(`4. ÉTATS DIVERGENTS (connus des deux côtés) : ${r.divergences.length}`);
    const parCause = new Map<CauseDivergence, typeof r.divergences>();
    for (const d of r.divergences) parCause.set(d.cause, [...(parCause.get(d.cause) ?? []), d]);
    for (const [cause, liste] of parCause) {
      ligne(liste.length, LIBELLES_CAUSE[cause]);
      const visibles = DETAIL ? liste : liste.slice(0, APERCU);
      for (const d of visibles) {
        console.log(`         ${redactDsNumber(d.numero)}  DN=${d.etatDn}  base=${d.dsStatus ?? "∅"}`);
      }
      if (visibles.length < liste.length) console.log(`         … (+${liste.length - visibles.length}, --detail)`);
    }
    console.log();

    console.log(`5. DATES DE DÉCISION DIVERGENTES (> 1 jour) : ${r.datesDivergentes.length}`);
    for (const d of DETAIL ? r.datesDivergentes : r.datesDivergentes.slice(0, APERCU)) {
      console.log(`         ${redactDsNumber(d.numero)}  DN=${jour(d.dateTraitementDn)}  base=${jour(d.processedAt)}`);
    }
    console.log();

    if (r.deposes.residu !== 0 || r.valides.residu !== 0) {
      console.log(
        `RÉSIDU NON NUL (déposés ${r.deposes.residu}, validés ${r.valides.residu}) : un cas échappe au classement.`
      );
    } else {
      console.log("Bilan bouclé : chaque écart est classé.");
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Analyse interrompue :", error instanceof Error ? error.message : error);
  process.exit(1);
});
