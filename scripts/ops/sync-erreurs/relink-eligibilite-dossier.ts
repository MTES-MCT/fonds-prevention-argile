/**
 * Relink d'un dossier d'éligibilité « mismatch » : le ds_number stocké est introuvable côté
 * DN (« not found »), mais l'usager a en réalité un dossier sous un AUTRE numéro (cf.
 * `ds:probe-dossiers --email-crosscheck`, verdict EXISTE_SOUS_AUTRE_NUMERO).
 *
 * Au lieu de reset (qui ferait un doublon et perdrait un dossier souvent déjà accepté), on
 * **repointe** le dossier local vers le vrai numéro, et on remet ses colonnes d'état à NULL
 * pour que la prochaine sync recopie l'état réel (accepté / en instruction…) et fasse avancer
 * le parcours.
 *
 * Modes (un des deux) :
 *   --parcours-id=<uuid> --to-ds-number=<n>   relink explicite (numéro cible confirmé via le probe)
 *   --from-sync-errors                        auto-découvre les mismatches (eligibilite/todo +
 *                                             sync-erreur, ds_number local introuvable, dossier
 *                                             sous un autre numéro pour l'email usager)
 *
 * Options :
 *   --apply         applique (sinon dry-run)
 *   --anonymize     masque les PII (id, email)
 *   --sleep=<ms>    délai entre appels DN (défaut 200 ms)
 *
 * Sélection auto : on ne relink que vers un dossier NON archivé, en préférant l'état le plus
 * avancé (accepté > en instruction > en construction > refusé/sans-suite). Ambiguïté
 * (plusieurs candidats au même meilleur état) → on **laisse** pour traitement manuel.
 *
 * APRÈS relink : relancer une synchro (bouton super-admin) pour recopier l'état réel.
 *
 * Prérequis : .env.local avec DATABASE_URL + DEMARCHES_SIMPLIFIEES_GRAPHQL_API_* .
 */

import { and, eq, isNotNull, isNull, desc } from "drizzle-orm";
import { createOpsDb } from "../lib/db";
import { DEMARCHE_IDS } from "../lib/env";
import { graphqlClient } from "@/features/parcours/dossiers-ds/adapters/graphql/client";
import { createRedactor } from "../lib/anonymize";
import { parcoursPrevention, users, dossiersDemarchesSimplifiees, syncRunEntries } from "@/shared/database/schema";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { getArg, hasFlag } from "../lib/args";

const APPLY = hasFlag("apply");
const ANONYMIZE = hasFlag("anonymize");
const FROM_SYNC_ERRORS = hasFlag("from-sync-errors");
const PARCOURS_ID = getArg("parcours-id");
const TO_DS_NUMBER = getArg("to-ds-number");
const SLEEP_MS = Number(getArg("sleep") ?? "200");

const { redactUuid, redactEmail } = createRedactor(ANONYMIZE);
const { db, client } = createOpsDb();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const norm = (e?: string | null) => e?.toLowerCase().trim() || null;
const MAX_PAGES = 80;

const STATE_RANK: Record<string, number> = {
  accepte: 4,
  en_instruction: 3,
  en_construction: 2,
  refuse: 1,
  sans_suite: 1,
};

interface Relink {
  parcoursId: string;
  dossierId: string;
  email: string | null;
  fromNumber: string;
  toNumber: string;
  toState: string;
}

/** Vrai si DN ne trouve pas le dossier (pointeur mort). */
async function isNotFound(dsNumber: string): Promise<boolean> {
  try {
    const d = await graphqlClient.getDossier(Number(dsNumber));
    return d === null;
  } catch (err) {
    return /not found/i.test(err instanceof Error ? err.message : String(err));
  }
}

/** Indexe la démarche éligibilité par email usager : email -> [{number, state, archived}]. */
async function buildEmailIndex(
  demarcheNumber: number
): Promise<Map<string, Array<{ number: number; state: string; archived: boolean }>>> {
  const index = new Map<string, Array<{ number: number; state: string; archived: boolean }>>();
  let after: string | null = null;
  let pages = 0;
  while (pages < MAX_PAGES) {
    pages++;
    const conn = await graphqlClient.getDemarcheDossiers(demarcheNumber, { first: 100, after: after ?? undefined });
    if (!conn) break;
    for (const node of conn.nodes) {
      const email = norm(node.usager?.email);
      if (!email) continue;
      const arr = index.get(email) ?? [];
      arr.push({ number: node.number, state: node.state, archived: !!node.archived });
      index.set(email, arr);
    }
    if (!conn.pageInfo.hasNextPage) break;
    after = conn.pageInfo.endCursor ?? null;
    if (SLEEP_MS > 0) await sleep(SLEEP_MS);
  }
  return index;
}

/** Choisit le meilleur dossier cible (non archivé, état le plus avancé). null si aucun ou ambigu. */
function pickTarget(
  candidates: Array<{ number: number; state: string; archived: boolean }>,
  excludeNumber: string
): { number: number; state: string } | null {
  const usable = candidates.filter((c) => !c.archived && String(c.number) !== excludeNumber);
  if (usable.length === 0) return null;
  const ranked = usable.map((c) => ({ ...c, rank: STATE_RANK[c.state] ?? 0 }));
  const best = Math.max(...ranked.map((c) => c.rank));
  const top = ranked.filter((c) => c.rank === best);
  if (top.length !== 1) return null; // ambigu -> manuel
  return { number: top[0].number, state: top[0].state };
}

async function getEligibiliteDossier(parcoursId: string) {
  const [d] = await db
    .select({ id: dossiersDemarchesSimplifiees.id, dsNumber: dossiersDemarchesSimplifiees.dsNumber })
    .from(dossiersDemarchesSimplifiees)
    .where(
      and(
        eq(dossiersDemarchesSimplifiees.parcoursId, parcoursId),
        eq(dossiersDemarchesSimplifiees.step, Step.ELIGIBILITE)
      )
    )
    .limit(1);
  return d ?? null;
}

/** Repointe le dossier vers le vrai numéro et remet les colonnes d'état à NULL (sync rebâtira). */
async function applyRelink(dossierId: string, toNumber: string): Promise<boolean> {
  const updated = await db
    .update(dossiersDemarchesSimplifiees)
    .set({
      dsNumber: toNumber,
      dsId: null,
      dsStatus: null,
      submittedAt: null,
      instructedAt: null,
      processedAt: null,
      lastSyncAt: null,
      dsUrl: null,
    })
    .where(eq(dossiersDemarchesSimplifiees.id, dossierId))
    .returning({ id: dossiersDemarchesSimplifiees.id });
  return updated.length > 0;
}

async function errorParcoursIds(): Promise<Set<string>> {
  const rows = await db
    .select({ parcoursId: syncRunEntries.parcoursId })
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
  return new Set(rows.map((r) => r.parcoursId));
}

async function discoverFromSyncErrors(): Promise<Relink[]> {
  const demarcheId = DEMARCHE_IDS[Step.ELIGIBILITE];
  if (!demarcheId) {
    console.error("DEMARCHES_SIMPLIFIEES_ID_ELIGIBILITE absent de l'env.");
    return [];
  }

  const rows = await db
    .select({
      parcoursId: parcoursPrevention.id,
      email: users.email,
      emailContact: users.emailContact,
      dossierId: dossiersDemarchesSimplifiees.id,
      dsNumber: dossiersDemarchesSimplifiees.dsNumber,
    })
    .from(parcoursPrevention)
    .innerJoin(users, eq(users.id, parcoursPrevention.userId))
    .innerJoin(
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
        isNull(parcoursPrevention.completedAt),
        isNotNull(dossiersDemarchesSimplifiees.dsNumber)
      )
    );

  const errorSet = await errorParcoursIds();
  const candidates = rows.filter((r) => errorSet.has(r.parcoursId));

  console.log(`Candidats sync-erreur (eligibilite/todo) : ${candidates.length}`);
  console.log("Indexation de la démarche éligibilité par email (lecture seule)...");
  const index = await buildEmailIndex(Number(demarcheId));

  const relinks: Relink[] = [];
  for (const c of candidates) {
    if (!c.dsNumber) continue;
    // Mismatch = le numéro local est introuvable mais l'usager a un dossier sous un autre numéro.
    if (!(await isNotFound(c.dsNumber))) {
      if (SLEEP_MS > 0) await sleep(SLEEP_MS);
      continue;
    }
    if (SLEEP_MS > 0) await sleep(SLEEP_MS);

    const emails = [norm(c.email), norm(c.emailContact)].filter((e): e is string => !!e);
    const hits = emails.flatMap((e) => index.get(e) ?? []);
    const target = pickTarget(hits, c.dsNumber);
    if (!target) continue;

    relinks.push({
      parcoursId: c.parcoursId,
      dossierId: c.dossierId,
      email: c.email,
      fromNumber: c.dsNumber,
      toNumber: String(target.number),
      toState: target.state,
    });
  }
  return relinks;
}

async function discoverExplicit(): Promise<Relink[]> {
  if (!PARCOURS_ID || !TO_DS_NUMBER) {
    console.error("Mode explicite : --parcours-id=<uuid> ET --to-ds-number=<n> requis.");
    return [];
  }
  const dossier = await getEligibiliteDossier(PARCOURS_ID);
  if (!dossier) {
    console.error("Aucun dossier d'éligibilité pour ce parcours.");
    return [];
  }
  if (!dossier.dsNumber) {
    console.error("Le dossier d'éligibilité n'a pas de ds_number local.");
    return [];
  }
  // Sécurité : le numéro local doit être mort, et le numéro cible doit exister côté DN.
  const localDead = await isNotFound(dossier.dsNumber);
  if (!localDead) {
    console.error(`Le numéro local #${dossier.dsNumber} existe encore côté DN — relink refusé (pas un mismatch).`);
    return [];
  }
  const targetExists = !(await isNotFound(TO_DS_NUMBER));
  if (!targetExists) {
    console.error(`Le numéro cible #${TO_DS_NUMBER} est introuvable côté DN — relink refusé.`);
    return [];
  }
  return [
    {
      parcoursId: PARCOURS_ID,
      dossierId: dossier.id,
      email: null,
      fromNumber: dossier.dsNumber,
      toNumber: TO_DS_NUMBER,
      toState: "(cible vérifiée)",
    },
  ];
}

async function main() {
  console.log("=".repeat(72));
  console.log(`RELINK ÉLIGIBILITÉ (mismatch) — ${APPLY ? "APPLY" : "DRY-RUN"}${ANONYMIZE ? " (anonymisé)" : ""}`);
  console.log("=".repeat(72));

  const relinks = FROM_SYNC_ERRORS ? await discoverFromSyncErrors() : await discoverExplicit();

  console.log();
  console.log(`Relinks proposés : ${relinks.length}`);
  for (const r of relinks) {
    console.log(
      `  [${redactUuid(r.parcoursId)}] ${redactEmail(r.email)} : #${r.fromNumber} → #${r.toNumber} (${r.toState})`
    );
  }
  console.log();

  if (relinks.length === 0) {
    console.log("Rien à relinker.");
    await client.end();
    return;
  }

  if (!APPLY) {
    console.log(`Mode dry-run — aucune écriture. Relancer avec --apply pour relinker ${relinks.length} dossier(s).`);
    await client.end();
    return;
  }

  let ok = 0;
  let failed = 0;
  for (const r of relinks) {
    try {
      const done = await applyRelink(r.dossierId, r.toNumber);
      if (done) {
        ok++;
        console.log(`  OK relink ${redactUuid(r.parcoursId)} : #${r.fromNumber} → #${r.toNumber}`);
      } else {
        failed++;
        console.log(`  ÉCHEC (dossier introuvable ?) ${redactUuid(r.parcoursId)}`);
      }
    } catch (err) {
      failed++;
      console.error(`  ERR ${redactUuid(r.parcoursId)} : ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log();
  console.log("=".repeat(72));
  console.log(`Terminé : ${ok} relink(s), ${failed} échec(s).`);
  console.log(
    "ÉTAPE SUIVANTE : relancer une synchro (bouton super-admin) pour recopier l'état réel et faire avancer les parcours."
  );
  console.log("=".repeat(72));

  await client.end();
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  client.end();
  process.exit(1);
});
