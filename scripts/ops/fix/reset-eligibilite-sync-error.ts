/**
 * Reset des demandeurs "SYNC EN ERREUR" bloqués en éligibilité, AVEC vérification DN.
 *
 * Contexte : cf docs/parcours/FLOW-AND-SYNC.md (§7, remédiation DN).
 * Sur `administration/diagnostics`, un parcours est classé sync-erreur dès qu'il existe
 * une entrée `sync_run_entries.error` non-null. Cas typique en éligibilité : la sync DN
 * renvoie « Dossier not found » — le `ds_number` local pointe vers un dossier qui
 * n'existe plus côté DN (jamais matérialisé, ou dossier en construction expiré/purgé par
 * DN). Le demandeur reste bloqué en `eligibilite/todo`.
 *
 * Remédiation : SUPPRIMER la ligne `dossiers_demarches_simplifiees` de l'étape éligibilité,
 * en laissant le parcours en `eligibilite/todo` (état "l'AMO vient de valider"). Côté
 * espace demandeur, `getDossierByStep` renvoie alors `null` → le CTA "Remplir le
 * formulaire d'éligibilité" réapparaît et `createEligibiliteDossier` génère un NOUVEAU
 * lien prefill ("commencer"), et non "reprendre" le dossier cassé.
 *
 * SÉCURITÉ — vérification DN par dossier (lecture seule) AVANT toute suppression :
 *   GONE    DN « Dossier not found » ou dossier inexistant → pointeur mort → RESET autorisé
 *   EXISTS  le dossier existe encore côté DN (en construction / en instruction / traité)
 *           → VRAIE donnée, jamais supprimé : la prochaine sync réussie le rattrapera
 *   PROBE_ERREUR  erreur DN autre que « not found » (unauthorized, réseau…) → jamais
 *           supprimé (incertitude)
 *   SANS_DOSSIER  pas de dossier d'éligibilité local → déjà au bon état, rien à faire
 *
 * On ne touche NI à la validation AMO (déjà LOGEMENT_ELIGIBLE), NI à `sync_run_entries`.
 *
 * Niveaux d'engagement :
 *   (rien)   dry-run : sonde DN, affiche le plan, aucune écriture
 *   --apply  supprime les lignes des dossiers confirmés GONE par DN
 *
 * Filtres / options :
 *   --parcours-id=<uuid>  limite à un seul parcours (cas isolé / debug)
 *   --sleep=<ms>          délai entre deux appels DN (défaut 200 ms)
 *   --anonymize           masque les PII (id, email) dans l'affichage
 *
 * Usage :
 *   pnpm fix:eligibilite-sync-error                      # dry-run (sonde DN)
 *   pnpm fix:eligibilite-sync-error --anonymize          # dry-run anonymisé
 *   pnpm fix:eligibilite-sync-error --apply              # supprime les GONE
 *   pnpm fix:eligibilite-sync-error --parcours-id=<uuid> # cible
 *
 * Prérequis : .env.local avec DATABASE_URL + DEMARCHES_SIMPLIFIEES_GRAPHQL_API_* .
 */

import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
// IMPORTANT : `createOpsDb` (via lib/env) charge dotenv à l'évaluation de son module.
// Il DOIT précéder l'import de `graphqlClient`, dont le singleton lit l'env DN à la
// construction et throw sinon. L'ordre d'évaluation ESM garantit dotenv avant le singleton.
import { createOpsDb } from "../lib/db";
import { graphqlClient } from "@/features/parcours/dossiers-ds/adapters/graphql/client";
import { createRedactor } from "../lib/anonymize";
import { parcoursPrevention, users, dossiersDemarchesSimplifiees, syncRunEntries } from "@/shared/database/schema";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { getArg, hasFlag } from "../lib/args";

// --- Args ---
const APPLY = hasFlag("apply");
const ANONYMIZE = hasFlag("anonymize");
const PARCOURS_ID_FILTER = getArg("parcours-id");
const SLEEP_MS = Number(getArg("sleep") ?? "200");

const { redactUuid, redactEmail } = createRedactor(ANONYMIZE);
const { db, client } = createOpsDb();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Verdict = "gone" | "exists" | "probe_erreur" | "sans_dossier";

interface Candidate {
  parcoursId: string;
  email: string | null;
  dossierId: string | null;
  dsNumber: string | null;
  localDsStatus: string | null;
  localSubmittedAt: Date | null;
  syncError: string;
  verdict: Verdict;
  dnState?: string; // état réel côté DN si EXISTS
  probeError?: string; // message si PROBE_ERREUR
}

/** Map parcoursId → dernière erreur de sync (réplique la logique du diagnostic). */
async function getErrorByParcours(): Promise<Map<string, string>> {
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

/** Interroge DN pour décider du sort du dossier (lecture seule). */
async function verifyAgainstDN(
  dsNumber: string
): Promise<{ verdict: Exclude<Verdict, "sans_dossier">; dnState?: string; probeError?: string }> {
  try {
    const d = await graphqlClient.getDossier(Number(dsNumber));
    // Réponse sans erreur mais dossier null → numéro inexistant côté DN → pointeur mort.
    if (!d) return { verdict: "gone" };
    return { verdict: "exists", dnState: d.state };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/not found/i.test(msg)) return { verdict: "gone" };
    return { verdict: "probe_erreur", probeError: msg };
  }
}

async function findCandidates(): Promise<Candidate[]> {
  const whereClauses = [
    eq(parcoursPrevention.currentStep, Step.ELIGIBILITE),
    eq(parcoursPrevention.currentStatus, Status.TODO),
    isNull(parcoursPrevention.archivedAt),
    isNull(parcoursPrevention.completedAt),
  ];
  if (PARCOURS_ID_FILTER) whereClauses.push(eq(parcoursPrevention.id, PARCOURS_ID_FILTER));

  const rows = await db
    .select({
      parcoursId: parcoursPrevention.id,
      email: users.email,
      dossierId: dossiersDemarchesSimplifiees.id,
      dsNumber: dossiersDemarchesSimplifiees.dsNumber,
      dsStatus: dossiersDemarchesSimplifiees.dsStatus,
      submittedAt: dossiersDemarchesSimplifiees.submittedAt,
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
    .where(and(...whereClauses));

  const errorByParcours = await getErrorByParcours();

  const candidates: Candidate[] = [];
  for (const r of rows) {
    const syncError = errorByParcours.get(r.parcoursId);
    if (!syncError) continue; // seulement les parcours réellement en sync-erreur

    const base = {
      parcoursId: r.parcoursId,
      email: r.email,
      dossierId: r.dossierId,
      dsNumber: r.dsNumber,
      localDsStatus: r.dsStatus,
      localSubmittedAt: r.submittedAt,
      syncError,
    };

    if (!r.dossierId || !r.dsNumber) {
      candidates.push({ ...base, verdict: "sans_dossier" });
      continue;
    }

    const dn = await verifyAgainstDN(r.dsNumber);
    candidates.push({ ...base, verdict: dn.verdict, dnState: dn.dnState, probeError: dn.probeError });
    if (SLEEP_MS > 0) await sleep(SLEEP_MS);
  }

  return candidates;
}

/** Suppression du dossier d'éligibilité confirmé disparu côté DN. */
async function deleteEligibiliteDossier(dossierId: string): Promise<boolean> {
  const deleted = await db
    .delete(dossiersDemarchesSimplifiees)
    .where(eq(dossiersDemarchesSimplifiees.id, dossierId))
    .returning({ id: dossiersDemarchesSimplifiees.id });
  return deleted.length > 0;
}

function line(c: Candidate): string {
  const num = c.dsNumber ? `#${c.dsNumber}` : "aucun dossier";
  return `[${redactUuid(c.parcoursId)}] ${redactEmail(c.email)} — ${num} local(ds_status=${c.localDsStatus ?? "null"})`;
}

async function main() {
  console.log("=".repeat(72));
  console.log(`RESET ÉLIGIBILITÉ SYNC-ERREUR — ${APPLY ? "APPLY" : "DRY-RUN"}${ANONYMIZE ? " (anonymisé)" : ""}`);
  console.log("=".repeat(72));
  console.log("Cible : parcours sync-erreur + eligibilite/todo, vérifiés côté DN avant suppression.");
  if (PARCOURS_ID_FILTER) console.log(`Filtre parcours-id : ${redactUuid(PARCOURS_ID_FILTER)}`);
  console.log("Sondage DN en cours (lecture seule)...");
  console.log();

  const candidates = await findCandidates();

  const gone = candidates.filter((c) => c.verdict === "gone");
  const exists = candidates.filter((c) => c.verdict === "exists");
  const probeErr = candidates.filter((c) => c.verdict === "probe_erreur");
  const sansDossier = candidates.filter((c) => c.verdict === "sans_dossier");

  console.log(`Candidats sync-erreur en eligibilite/todo : ${candidates.length}`);
  console.log(`  - GONE (supprimé/introuvable côté DN) → RESET : ${gone.length}`);
  console.log(`  - EXISTS (existe encore côté DN) → laissé          : ${exists.length}`);
  console.log(`  - PROBE_ERREUR (erreur DN ≠ not found) → laissé    : ${probeErr.length}`);
  console.log(`  - SANS_DOSSIER (rien à supprimer)                  : ${sansDossier.length}`);
  console.log();

  if (gone.length > 0) {
    console.log("--- GONE (à reset : suppression du dossier d'éligibilité) ---");
    for (const c of gone) console.log(`  ${line(c)}`);
    console.log();
  }
  if (exists.length > 0) {
    console.log("--- EXISTS (NE PAS toucher — vraie donnée DN, la prochaine sync rattrapera) ---");
    for (const c of exists) console.log(`  ${line(c)} — DN state=${c.dnState}`);
    console.log();
  }
  if (probeErr.length > 0) {
    console.log("--- PROBE_ERREUR (laissé, incertitude) ---");
    for (const c of probeErr) console.log(`  ${line(c)} — ${c.probeError}`);
    console.log();
  }

  if (gone.length === 0) {
    console.log("Aucun dossier confirmé disparu côté DN. Rien à supprimer.");
    await client.end();
    return;
  }

  if (!APPLY) {
    console.log(`Mode dry-run — aucune écriture. Relancer avec --apply pour supprimer ${gone.length} dossier(s) GONE.`);
    await client.end();
    return;
  }

  // --- Exécution ---
  console.log("=".repeat(72));
  console.log("EXÉCUTION");
  console.log("=".repeat(72));

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const c of gone) {
    if (!c.dossierId) continue;
    try {
      const deleted = await deleteEligibiliteDossier(c.dossierId);
      if (deleted) {
        ok++;
        console.log(`  OK reset ${redactUuid(c.parcoursId)} (dossier supprimé)`);
      } else {
        skipped++;
        console.log(`  SKIP (déjà supprimé ?) ${redactUuid(c.parcoursId)}`);
      }
    } catch (err) {
      failed++;
      console.error(`  ERR ${redactUuid(c.parcoursId)} : ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log();
  console.log("=".repeat(72));
  console.log(`Terminé : ${ok} reset, ${skipped} skip, ${failed} échec(s). EXISTS laissés : ${exists.length}.`);
  console.log(
    "Le dossier supprimé, ces parcours quittent l'état sync-erreur au prochain chargement du diagnostic (l'erreur devient obsolète, sans dossier courant). Historique sync_run_entries conservé."
  );
  console.log("=".repeat(72));

  await client.end();
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  client.end();
  process.exit(1);
});
