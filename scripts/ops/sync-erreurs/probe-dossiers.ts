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
 *                        de la page diagnostics). Corrèle avec ds_status / submitted_at locaux,
 *                        et produit un PLAN D'ACTION (cas A/B1/B2/B3 → resync/reset/relink/clean).
 *                        Ajouter --email-crosscheck pour distinguer le mismatch (B2) du reset.
 *   --numbers=1,2,3      sonde une liste explicite de numéros DN.
 *
 * Options :
 *   --email-crosscheck  pour chaque dossier disparu (GONE), pagine la démarche éligibilité
 *                       et cherche si l'usager a un dossier sous un AUTRE numéro
 *                       (ABSENT = drop-off vs EXISTE_SOUS_AUTRE_NUMERO = mismatch récupérable).
 *   --no-anonymize      affiche en CLAIR le nom/prénom + email du demandeur (et les ids) —
 *                       pratique pour copier-coller et contacter (par défaut : anonymisé).
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

import { and, eq, isNull } from "drizzle-orm";
// IMPORTANT : `createOpsDb` (via lib/env) charge dotenv à l'évaluation de son module.
// Il DOIT être importé AVANT `graphqlClient`, dont le singleton lit l'env DN à la
// construction et throw si l'env n'est pas chargé. L'ordre d'évaluation ESM (source-order,
// profondeur d'abord) garantit que dotenv tourne avant la construction du singleton.
import { createOpsDb } from "../lib/db";
import { DEMARCHE_IDS } from "../lib/env";
import { graphqlClient } from "@/features/parcours/dossiers-ds/adapters/graphql/client";
import { createRedactor } from "../lib/anonymize";
import { parcoursPrevention, users, dossiersDemarchesSimplifiees } from "@/shared/database/schema";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { getArg, hasFlag } from "../lib/args";
import { sleep, norm, getErrorByParcours, buildEmailIndex } from "./_shared";

// --- Args ---
const FROM_SYNC_ERRORS = hasFlag("from-sync-errors");
const NUMBERS_ARG = getArg("numbers");
const EMAIL_CROSSCHECK = hasFlag("email-crosscheck");
const ANONYMIZE = !hasFlag("no-anonymize"); // anonymisé par défaut
const SLEEP_MS = Number(getArg("sleep") ?? "200");

const { redactEmail, redactUuid, redactName } = createRedactor(ANONYMIZE);

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
  nom?: string | null;
  prenom?: string | null;
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

async function targetsFromSyncErrors(db: ReturnType<typeof createOpsDb>["db"]): Promise<Cible[]> {
  const rows = await db
    .select({
      parcoursId: parcoursPrevention.id,
      email: users.email,
      emailContact: users.emailContact,
      nom: users.nom,
      prenom: users.prenom,
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
      nom: r.nom,
      prenom: r.prenom,
      localDsStatus: r.dsStatus,
      localSubmittedAt: r.submittedAt,
      localLastSyncAt: r.lastSyncAt,
      localCreatedAt: r.createdAt,
    }));
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

// --- Cas final + action (cf. docs/parcours/SYNC-ERREURS-ET-REMEDIATION.md §2) ---
type Cas = "A_EXISTS" | "B1_DROPOFF" | "B2_MISMATCH" | "B3_EXPIRE" | "ERREUR_SONDAGE" | "INDETERMINE";
type Action = "resync" | "reset" | "relink" | "clean" | "check-permissions";

const ACTION_HINT: Record<Action, string> = {
  resync: "« Lancer une synchro maintenant »",
  reset: "pnpm fix:eligibilite-sync-error --apply",
  relink: "pnpm fix:relink-eligibilite --from-sync-errors --apply",
  clean: "pnpm fix:clean-faux-depots --apply",
  "check-permissions": "pnpm ds:check-permissions",
};

const CAS_LABEL: Record<Cas, string> = {
  A_EXISTS: "A — existe côté DN",
  B1_DROPOFF: "B1 — drop-off (prefill jamais complété)",
  B2_MISMATCH: "B2 — mismatch (existe sous un autre numéro)",
  B3_EXPIRE: "B3 — déposé puis purgé/expiré",
  ERREUR_SONDAGE: "Erreur de sondage (token/démarche)",
  INDETERMINE: "Indéterminé",
};

/**
 * Cas final + action(s) d'un dossier, à partir du verdict DN et du mismatch. `clean` est
 * transverse (faux dépôt legacy : submitted_at posé sans sync). Ne s'applique qu'en mode
 * --from-sync-errors (signaux locaux requis).
 */
function classifyCase(r: ProbeResult, isMismatch: boolean): { cas: Cas; actions: Action[] } {
  const fauxDepot = !!r.localSubmittedAt && !r.localLastSyncAt;
  const clean: Action[] = fauxDepot ? ["clean"] : [];

  if (r.categorie === "EN_INSTRUCTION" || r.categorie === "DEPOSE_NON_INSTRUIT" || r.categorie === "TRAITE") {
    return { cas: "A_EXISTS", actions: ["resync", ...clean] };
  }
  if (r.categorie === "SUPPRIME_OU_INTROUVABLE" || r.categorie === "INEXISTANT") {
    if (isMismatch) return { cas: "B2_MISMATCH", actions: ["relink"] };
    return { cas: r.localLastSyncAt ? "B3_EXPIRE" : "B1_DROPOFF", actions: ["reset", ...clean] };
  }
  if (r.categorie === "ERREUR_API") return { cas: "ERREUR_SONDAGE", actions: ["check-permissions"] };
  return { cas: "INDETERMINE", actions: clean };
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
      ? ` | local: ds_status=${r.localDsStatus ?? "null"} submitted_at=${r.localSubmittedAt ? r.localSubmittedAt.toISOString() : "null"} | ${redactUuid(r.parcoursId)} ${redactName(r.nom, r.prenom)} ${redactEmail(r.email)}`
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
  const mismatchNumbers = new Set<string>();
  let crosscheckRan = false;
  if (EMAIL_CROSSCHECK && FROM_SYNC_ERRORS) {
    const goneResults = results.filter(
      (r) => r.categorie === "SUPPRIME_OU_INTROUVABLE" || r.categorie === "INEXISTANT"
    );
    const demarcheId = DEMARCHE_IDS[Step.ELIGIBILITE];

    if (goneResults.length === 0) {
      console.log("\nCross-check : aucun GONE à vérifier.");
      crosscheckRan = true;
    } else if (!demarcheId) {
      console.log("\nCross-check ignoré : DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE absent de l'env.");
    } else {
      console.log("\nCross-check email sur la démarche éligibilité (pagination, lecture seule)...");
      const { index, capped } = await buildEmailIndex(graphqlClient, Number(demarcheId), SLEEP_MS);
      if (capped) console.log("  (pagination plafonnée — résultats potentiellement partiels)");
      console.log();
      console.log("--- CROSS-CHECK des GONE ---");

      let absent = 0;
      for (const r of goneResults) {
        const emails = [...new Set([norm(r.email), norm(r.emailContact)].filter((e): e is string => !!e))];
        // Dédup par numéro (email == emailContact ou pagination peuvent doubler les entrées).
        const found = [
          ...new Map(
            emails
              .flatMap((e) => index.get(e) ?? [])
              .filter((d) => String(d.number) !== r.dsNumber)
              .map((d) => [d.number, d])
          ).values(),
        ];
        if (found.length > 0) {
          mismatchNumbers.add(r.dsNumber);
          const list = found.map((d) => `#${d.number}(${d.state})`).join(", ");
          console.log(
            `  #${r.dsNumber}  EXISTE_SOUS_AUTRE_NUMERO → ${list} | ${redactName(r.nom, r.prenom)} ${redactEmail(r.email)}`
          );
        } else {
          absent++;
          console.log(`  #${r.dsNumber}  ABSENT (drop-off) | ${redactName(r.nom, r.prenom)} ${redactEmail(r.email)}`);
        }
      }
      console.log();
      console.log(
        `  Cross-check : ${mismatchNumbers.size} sous un autre numéro (mismatch récupérable), ${absent} absent (drop-off).`
      );
      console.log("=".repeat(72));
      crosscheckRan = true;
    }
  }

  // --- PLAN D'ACTION (par cas) — seulement en mode --from-sync-errors ---
  if (FROM_SYNC_ERRORS) {
    const cases = results.map((r) => classifyCase(r, mismatchNumbers.has(r.dsNumber)));

    const casCount = new Map<Cas, number>();
    const actionCount = new Map<Action, number>();
    for (const c of cases) {
      casCount.set(c.cas, (casCount.get(c.cas) ?? 0) + 1);
      for (const a of c.actions) actionCount.set(a, (actionCount.get(a) ?? 0) + 1);
    }

    console.log();
    console.log("=".repeat(72));
    console.log("PLAN D'ACTION");
    console.log("  par cas :");
    for (const [cas, n] of [...casCount.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${CAS_LABEL[cas].padEnd(48)} : ${n}`);
    }
    if (!crosscheckRan) {
      console.log("  (mismatch B2 NON vérifié — relancer avec --email-crosscheck pour le distinguer du reset)");
    }
    console.log("  actions à mener :");
    for (const a of ["resync", "relink", "reset", "clean", "check-permissions"] as Action[]) {
      const n = actionCount.get(a) ?? 0;
      if (n > 0) console.log(`    ${a.padEnd(10)} : ${String(n).padStart(3)}  → ${ACTION_HINT[a]}`);
    }
    console.log("  Ordre recommandé : relink → reset → clean ; resync via « Lancer une synchro ».");
    console.log("=".repeat(72));
  }

  if (dbHandle) await dbHandle.client.end();
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
