/**
 * Sonde LECTURE SEULE de dossiers Démarches Numériques (DN), pour diagnostiquer
 * les « sync erreur / Dossier not found » sans rien modifier.
 *
 * Objectif : confirmer empiriquement l'état réel côté DN de chaque dossier en erreur —
 * réellement supprimé/expiré (déposé jamais instruit), encore présent, jamais déposé, etc.
 *
 * Pour chaque numéro de dossier, interroge `graphqlClient.getDossier` et classe la réponse :
 *   SUPPRIME_OU_INTROUVABLE  erreur GraphQL « Dossier not found » → le dossier n'existe plus côté DN
 *   INEXISTANT               réponse sans erreur mais dossier null (numéro jamais matérialisé)
 *   DEPOSE_NON_INSTRUIT      existe, en construction, jamais passé en instruction (piste expiration)
 *   EN_INSTRUCTION           existe, pris en instruction par la DDT
 *   TRAITE                   existe, traité (accepté/refusé/sans suite)
 *   ERREUR_API               autre erreur (unauthorized, réseau…)
 *
 * Modes (un des deux) :
 *   --from-sync-errors   sonde tous les dossiers d'éligibilité des parcours actifs en
 *                        eligibilite/todo ayant une erreur de sync (= les "SYNC EN ERREUR"
 *                        de la page diagnostics). Corrèle avec ds_status / submitted_at locaux.
 *   --numbers=1,2,3      sonde une liste explicite de numéros DN.
 *
 * Options :
 *   --email-crosscheck  pour chaque dossier disparu (GONE), pagine la démarche éligibilité
 *                       et cherche si l'usager a un dossier sous un AUTRE numéro
 *                       (ABSENT = drop-off vs EXISTE_SOUS_AUTRE_NUMERO = mismatch récupérable).
 *   --no-anonymize      affiche les emails/identifiants en clair (par défaut : anonymisé).
 *   --sleep=<ms>        délai entre deux appels DN (défaut 200 ms).
 *
 * LECTURE SEULE : aucune écriture en base ni côté DN.
 *
 * Usage :
 *   pnpm ds:probe-dossiers --from-sync-errors
 *   pnpm ds:probe-dossiers --numbers=28621590,32006324,32034062
 *
 * Prérequis : .env.local avec DATABASE_URL + DEMARCHES_SIMPLIFIEES_GRAPHQL_API_* .
 */

import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
// IMPORTANT : `createOpsDb` (via lib/env) charge dotenv à l'évaluation de son module.
// Il DOIT être importé AVANT `graphqlClient`, dont le singleton lit l'env DN à la
// construction et throw si l'env n'est pas chargé. L'ordre d'évaluation ESM (source-order,
// profondeur d'abord) garantit que dotenv tourne avant la construction du singleton.
import { createOpsDb } from "../lib/db";
import { DEMARCHE_IDS } from "../lib/env";
import { graphqlClient } from "@/features/parcours/dossiers-ds/adapters/graphql/client";
import { createRedactor } from "../lib/anonymize";
import { parcoursPrevention, users, dossiersDemarchesSimplifiees, syncRunEntries } from "@/shared/database/schema";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { getArg, hasFlag } from "../lib/args";

// --- Args ---
const FROM_SYNC_ERRORS = hasFlag("from-sync-errors");
const NUMBERS_ARG = getArg("numbers");
const EMAIL_CROSSCHECK = hasFlag("email-crosscheck");
const ANONYMIZE = !hasFlag("no-anonymize"); // anonymisé par défaut
const SLEEP_MS = Number(getArg("sleep") ?? "200");

const { redactEmail, redactUuid } = createRedactor(ANONYMIZE);

type Categorie =
  | "SUPPRIME_OU_INTROUVABLE"
  | "INEXISTANT"
  | "DEPOSE_NON_INSTRUIT"
  | "EN_INSTRUCTION"
  | "TRAITE"
  | "ERREUR_API";

interface Cible {
  dsNumber: string;
  parcoursId?: string;
  email?: string | null;
  emailContact?: string | null;
  localDsStatus?: string | null;
  localSubmittedAt?: Date | null;
  localLastSyncAt?: Date | null;
  localCreatedAt?: Date | null;
}

interface ProbeResult extends Cible {
  categorie: Categorie;
  dsState?: string | null;
  archived?: boolean | null;
  datePassageEnConstruction?: string | null;
  datePassageEnInstruction?: string | null;
  dateTraitement?: string | null;
  instructeurs?: number;
  errorMessage?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Map parcoursId → dernière erreur de sync (réplique la logique du diagnostic). */
async function getErrorByParcours(db: ReturnType<typeof createOpsDb>["db"]): Promise<Map<string, string>> {
  const rows = await db
    .select({ parcoursId: syncRunEntries.parcoursId, error: syncRunEntries.error })
    .from(syncRunEntries)
    .innerJoin(parcoursPrevention, eq(parcoursPrevention.id, syncRunEntries.parcoursId))
    .where(
      and(
        isNotNull(syncRunEntries.error),
        isNull(parcoursPrevention.archivedAt),
        isNull(parcoursPrevention.completedAt)
      )
    )
    .orderBy(desc(syncRunEntries.createdAt));

  const map = new Map<string, string>();
  for (const e of rows) if (e.error && !map.has(e.parcoursId)) map.set(e.parcoursId, e.error);
  return map;
}

async function targetsFromSyncErrors(db: ReturnType<typeof createOpsDb>["db"]): Promise<Cible[]> {
  const rows = await db
    .select({
      parcoursId: parcoursPrevention.id,
      email: users.email,
      emailContact: users.emailContact,
      dsNumber: dossiersDemarchesSimplifiees.dsNumber,
      dsStatus: dossiersDemarchesSimplifiees.dsStatus,
      submittedAt: dossiersDemarchesSimplifiees.submittedAt,
      lastSyncAt: dossiersDemarchesSimplifiees.lastSyncAt,
      createdAt: dossiersDemarchesSimplifiees.createdAt,
    })
    .from(parcoursPrevention)
    .innerJoin(users, eq(users.id, parcoursPrevention.userId))
    .leftJoin(
      dossiersDemarchesSimplifiees,
      and(
        eq(dossiersDemarchesSimplifiees.parcoursId, parcoursPrevention.id),
        eq(dossiersDemarchesSimplifiees.step, Step.ELIGIBILITE)
      )
    )
    .where(
      and(
        eq(parcoursPrevention.currentStep, Step.ELIGIBILITE),
        eq(parcoursPrevention.currentStatus, Status.TODO),
        isNull(parcoursPrevention.archivedAt),
        isNull(parcoursPrevention.completedAt)
      )
    );

  const errorByParcours = await getErrorByParcours(db);

  return rows
    .filter((r) => errorByParcours.has(r.parcoursId) && r.dsNumber)
    .map((r) => ({
      dsNumber: r.dsNumber as string,
      parcoursId: r.parcoursId,
      email: r.email,
      emailContact: r.emailContact,
      localDsStatus: r.dsStatus,
      localSubmittedAt: r.submittedAt,
      localLastSyncAt: r.lastSyncAt,
      localCreatedAt: r.createdAt,
    }));
}

const norm = (e?: string | null) => e?.toLowerCase().trim() || null;
const MAX_PAGES = 80; // garde-fou pagination de la démarche

/**
 * Indexe les dossiers de la démarche éligibilité par email usager (une seule pagination).
 * Sert au cross-check : retrouver un dossier existant sous un AUTRE numéro que celui stocké.
 */
async function buildEmailIndex(
  demarcheNumber: number
): Promise<{ index: Map<string, Array<{ number: number; state: string }>>; capped: boolean }> {
  const index = new Map<string, Array<{ number: number; state: string }>>();
  let after: string | null = null;
  let pages = 0;
  let capped = false;

  while (pages < MAX_PAGES) {
    pages++;
    const conn = await graphqlClient.getDemarcheDossiers(demarcheNumber, { first: 100, after: after ?? undefined });
    if (!conn) break;
    for (const node of conn.nodes) {
      const email = norm(node.usager?.email);
      if (!email) continue;
      const arr = index.get(email) ?? [];
      arr.push({ number: node.number, state: node.state });
      index.set(email, arr);
    }
    if (!conn.pageInfo.hasNextPage) break;
    after = conn.pageInfo.endCursor ?? null;
    if (SLEEP_MS > 0) await sleep(SLEEP_MS);
    if (pages >= MAX_PAGES && conn.pageInfo.hasNextPage) capped = true;
  }
  return { index, capped };
}

const DAY_MS = 1000 * 60 * 60 * 24;
function ageDays(d?: Date | null): number | null {
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / DAY_MS);
}

/**
 * Sous-classification d'un dossier disparu côté DN, à partir des signaux LOCAUX
 * (DN n'a plus rien à renvoyer pour un dossier supprimé).
 *
 * Signal fiable d'un VRAI dépôt = `last_sync_at` renseigné (une sync a confirmé le dossier
 * côté DN). `submitted_at` seul n'est PAS fiable : avant la PR #216 il était posé à la
 * création (faux dépôt legacy). Donc :
 *   - last_sync_at renseigné → réellement confirmé puis disparu → probable expiration DN.
 *   - last_sync_at NULL      → jamais confirmé (prefill jamais complété) → lien jamais fait,
 *                              quel que soit un éventuel submitted_at legacy.
 */
function goneSub(r: ProbeResult): { kind: "expiration" | "jamais_depose" | "inconnu"; label: string } {
  if (r.parcoursId === undefined) return { kind: "inconnu", label: "" }; // mode --numbers : pas de données locales
  if (r.localLastSyncAt) {
    const ref = r.localSubmittedAt ?? r.localLastSyncAt;
    return { kind: "expiration", label: `dépôt confirmé il y a ${ageDays(ref)}j → probable expiration/purge DN` };
  }
  const n = ageDays(r.localCreatedAt);
  return {
    kind: "jamais_depose",
    label: `jamais confirmé côté DN${n !== null ? `, créé il y a ${n}j` : ""} → prefill jamais complété`,
  };
}

async function probe(
  getDossier: (n: number) => Promise<{
    state: string;
    archived?: boolean;
    datePassageEnConstruction?: string | null;
    datePassageEnInstruction?: string | null;
    dateTraitement?: string | null;
    instructeurs?: Array<unknown> | null;
  } | null>,
  cible: Cible
): Promise<ProbeResult> {
  try {
    const d = await getDossier(Number(cible.dsNumber));
    if (!d) {
      return { ...cible, categorie: "INEXISTANT" };
    }
    const instruit = !!d.datePassageEnInstruction;
    const traite = !!d.dateTraitement;
    const categorie: Categorie = traite ? "TRAITE" : instruit ? "EN_INSTRUCTION" : "DEPOSE_NON_INSTRUIT";
    return {
      ...cible,
      categorie,
      dsState: d.state,
      archived: d.archived ?? null,
      datePassageEnConstruction: d.datePassageEnConstruction ?? null,
      datePassageEnInstruction: d.datePassageEnInstruction ?? null,
      dateTraitement: d.dateTraitement ?? null,
      instructeurs: d.instructeurs?.length ?? 0,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const categorie: Categorie = /not found/i.test(msg) ? "SUPPRIME_OU_INTROUVABLE" : "ERREUR_API";
    return { ...cible, categorie, errorMessage: msg };
  }
}

function printResult(r: ProbeResult) {
  const local =
    r.parcoursId !== undefined
      ? ` | local: ds_status=${r.localDsStatus ?? "null"} submitted_at=${r.localSubmittedAt ? r.localSubmittedAt.toISOString() : "null"} | ${redactUuid(r.parcoursId)} ${redactEmail(r.email)}`
      : "";

  if (r.categorie === "SUPPRIME_OU_INTROUVABLE" || r.categorie === "ERREUR_API" || r.categorie === "INEXISTANT") {
    const isGone = r.categorie === "SUPPRIME_OU_INTROUVABLE" || r.categorie === "INEXISTANT";
    const sub = isGone ? goneSub(r) : { label: "" };
    const subStr = sub.label ? `  [${sub.label}]` : "";
    console.log(`  #${r.dsNumber}  ${r.categorie}${r.errorMessage ? ` (${r.errorMessage})` : ""}${subStr}${local}`);
    return;
  }
  console.log(
    `  #${r.dsNumber}  ${r.categorie}  state=${r.dsState} archived=${r.archived} ` +
      `construction=${r.datePassageEnConstruction ?? "-"} instruction=${r.datePassageEnInstruction ?? "-"} ` +
      `traitement=${r.dateTraitement ?? "-"} instructeurs=${r.instructeurs}${local}`
  );
}

async function main() {
  if (!FROM_SYNC_ERRORS && !NUMBERS_ARG) {
    console.error("Préciser --from-sync-errors OU --numbers=1,2,3");
    process.exit(1);
  }

  console.log("=".repeat(72));
  console.log(`PROBE DOSSIERS DN — LECTURE SEULE${ANONYMIZE ? " (anonymisé)" : ""}`);
  console.log("=".repeat(72));

  let cibles: Cible[];
  let dbHandle: ReturnType<typeof createOpsDb> | null = null;

  if (FROM_SYNC_ERRORS) {
    dbHandle = createOpsDb();
    cibles = await targetsFromSyncErrors(dbHandle.db);
    console.log(`Cibles (eligibilite/todo + sync erreur) : ${cibles.length}`);
  } else {
    cibles = (NUMBERS_ARG ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((dsNumber) => ({ dsNumber }));
    console.log(`Cibles (numéros explicites) : ${cibles.length}`);
  }
  console.log();

  const results: ProbeResult[] = [];
  for (const cible of cibles) {
    const r = await probe((n) => graphqlClient.getDossier(n), cible);
    results.push(r);
    printResult(r);
    if (SLEEP_MS > 0) await sleep(SLEEP_MS);
  }

  // --- Récap par catégorie ---
  const counts = new Map<Categorie, number>();
  for (const r of results) counts.set(r.categorie, (counts.get(r.categorie) ?? 0) + 1);

  console.log();
  console.log("=".repeat(72));
  console.log("RÉCAP");
  for (const [cat, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat.padEnd(24)} : ${n}`);
  }

  // Sous-classification des dossiers disparus (uniquement en mode --from-sync-errors,
  // où les signaux locaux last_sync_at / created_at sont disponibles).
  if (FROM_SYNC_ERRORS) {
    const goneResults = results.filter(
      (r) => r.categorie === "SUPPRIME_OU_INTROUVABLE" || r.categorie === "INEXISTANT"
    );
    if (goneResults.length > 0) {
      const expiration = goneResults.filter((r) => goneSub(r).kind === "expiration").length;
      const jamaisDepose = goneResults.filter((r) => goneSub(r).kind === "jamais_depose").length;
      console.log("  ── dont disparus côté DN :");
      console.log(`     dépôt confirmé (last_sync_at) puis disparu : ${expiration}`);
      console.log(`     jamais confirmé (prefill non complété)     : ${jamaisDepose}`);
    }
  }
  console.log("=".repeat(72));

  // --- Cross-check email : un GONE a-t-il un dossier sous un AUTRE numéro côté DN ? ---
  if (EMAIL_CROSSCHECK && FROM_SYNC_ERRORS) {
    const goneResults = results.filter(
      (r) => r.categorie === "SUPPRIME_OU_INTROUVABLE" || r.categorie === "INEXISTANT"
    );
    const demarcheId = DEMARCHE_IDS[Step.ELIGIBILITE];

    if (goneResults.length === 0) {
      console.log("\nCross-check : aucun GONE à vérifier.");
    } else if (!demarcheId) {
      console.log("\nCross-check ignoré : DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE absent de l'env.");
    } else {
      console.log("\nCross-check email sur la démarche éligibilité (pagination, lecture seule)...");
      const { index, capped } = await buildEmailIndex(Number(demarcheId));
      if (capped) console.log("  (pagination plafonnée — résultats potentiellement partiels)");
      console.log();
      console.log("--- CROSS-CHECK des GONE ---");

      let absent = 0;
      let mismatch = 0;
      for (const r of goneResults) {
        const emails = [norm(r.email), norm(r.emailContact)].filter((e): e is string => !!e);
        const found = emails.flatMap((e) => index.get(e) ?? []).filter((d) => String(d.number) !== r.dsNumber);
        if (found.length > 0) {
          mismatch++;
          const list = found.map((d) => `#${d.number}(${d.state})`).join(", ");
          console.log(`  #${r.dsNumber}  EXISTE_SOUS_AUTRE_NUMERO → ${list} | ${redactEmail(r.email)}`);
        } else {
          absent++;
          console.log(`  #${r.dsNumber}  ABSENT (drop-off) | ${redactEmail(r.email)}`);
        }
      }
      console.log();
      console.log(
        `  Cross-check : ${mismatch} sous un autre numéro (mismatch récupérable), ${absent} absent (drop-off).`
      );
      console.log("=".repeat(72));
    }
  }

  if (dbHandle) await dbHandle.client.end();
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
