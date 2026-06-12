/**
 * Script d'audit (read-only) des parcours bloqués sur le dossier de leur étape courante.
 *
 * Cible : parcours actifs dont le dossier de l'étape courante est :
 *   - `en_construction` : brouillon créé mais jamais déposé par l'usager (drop-off), OU
 *   - `en_instruction`  : déposé mais qui n'avance pas (en attente instructeur, ou désync).
 * Les DEUX statuts sont audités par défaut ; `--only=<statut>` restreint à l'un d'eux.
 *
 * Avec `--check-ds`, croise chaque dossier avec son vrai statut DS pour distinguer :
 *   - drop-off usager (DS aussi en_construction) — pas un bug ;
 *   - désynchronisation (DS plus avancé que nous) — vrai bug à corriger ;
 *   - dossier DS supprimé / inaccessible (démarche test, permission) — cf. ADR-0009.
 *
 * AUCUNE ÉCRITURE EN BASE. AUCUN APPEL D'ÉCRITURE VERS DS.
 *
 * Usage :
 *   pnpm audit:dossiers-bloques
 *   pnpm audit:dossiers-bloques --check-ds                 # croise avec le vrai statut DS
 *   pnpm audit:dossiers-bloques --only=en_instruction      # un seul statut
 *   pnpm audit:dossiers-bloques --older-than=30            # seulement les bloqués depuis > 30 j
 *   pnpm audit:dossiers-bloques --check-ds --csv=rapport.csv --anonymize
 *
 * Prérequis : .env.local avec DATABASE_URL (+ DEMARCHES_SIMPLIFIEES_* si --check-ds).
 */

import { writeFileSync } from "node:fs";
import { and, eq, inArray, isNull, desc } from "drizzle-orm";
import { parcoursPrevention, users, dossiersDemarchesSimplifiees } from "@/shared/database/schema";
import { createOpsDb } from "../lib/db";
import { getDossierState } from "../lib/ds-graphql";
import { createRedactor } from "../lib/anonymize";
import { STEP_LABELS } from "@/shared/domain/value-objects/step.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { getArg, hasFlag } from "../lib/args";

// --- Args ---
const CHECK_DS = hasFlag("check-ds");
const CSV_PATH = getArg("csv");
const ANONYMIZE = hasFlag("anonymize");
const OLDER_THAN_DAYS = getArg("older-than") ? Number(getArg("older-than")) : 0;

// Statuts audités : les deux par défaut, restreignables via --only=
const ONLY = getArg("only");
const TARGET_STATUSES: DSStatus[] =
  ONLY === DSStatus.EN_CONSTRUCTION
    ? [DSStatus.EN_CONSTRUCTION]
    : ONLY === DSStatus.EN_INSTRUCTION
      ? [DSStatus.EN_INSTRUCTION]
      : [DSStatus.EN_CONSTRUCTION, DSStatus.EN_INSTRUCTION];

if (ONLY && ONLY !== DSStatus.EN_CONSTRUCTION && ONLY !== DSStatus.EN_INSTRUCTION) {
  console.error(`--only doit valoir "${DSStatus.EN_CONSTRUCTION}" ou "${DSStatus.EN_INSTRUCTION}"`);
  process.exit(1);
}

// --- Anonymisation ---
const { redactEmail } = createRedactor(ANONYMIZE);

// --- DB ---
const { db, client } = createOpsDb();

// --- Helpers ---
const NOW = Date.now();
function ageDays(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((NOW - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}
function ageBucket(days: number | null): string {
  if (days === null) return "inconnu";
  if (days > 90) return ">90j";
  if (days > 30) return ">30j";
  if (days > 7) return ">7j";
  return "<=7j";
}
function fmtDate(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}
/** Type d'URL DS stockée (anonymisation-safe : pas de token exposé). */
function dsUrlKind(url: string | null): string {
  if (!url) return "";
  if (url.includes("/commencer/") && url.includes("prefill_token")) return "prefill";
  if (url.includes("/dossiers/")) return "stable";
  return "autre";
}

/**
 * Classe un dossier bloqué selon notre statut interne et le vrai statut DS.
 * Distingue le drop-off usager (pas un bug) de la désynchronisation (bug).
 */
function classify(ourStatus: string, ds: { state?: string; error?: string }): string {
  if (ds.error === "not_found") return "ds_supprime";
  if (ds.error === "unauthorized") return "ds_inaccessible";
  if (ds.error) return `ds_erreur(${ds.error})`;
  const s = ds.state;
  if (ourStatus === DSStatus.EN_CONSTRUCTION) {
    if (s === "en_construction") return "jamais_depose";
    return "desync"; // DS avancé alors qu'on est en_construction → bug
  }
  // ourStatus === en_instruction
  if (s === "accepte") return "desync_a_syncer";
  if (s === "en_instruction") return "en_attente_instructeur";
  if (s === "refuse" || s === "sans_suite") return "desync";
  if (s === "en_construction") return "regression_ds";
  return `inattendu(${s ?? "?"})`;
}

async function main() {
  console.log(
    `\nAudit dossiers bloqués — statuts: ${TARGET_STATUSES.join(", ")}${OLDER_THAN_DAYS ? ` (> ${OLDER_THAN_DAYS} j)` : ""}\n`
  );

  // Dossier de l'étape COURANTE du parcours, dans un des statuts ciblés, parcours actif.
  const rows = await db
    .select({
      parcoursId: parcoursPrevention.id,
      step: parcoursPrevention.currentStep,
      internalStatus: parcoursPrevention.currentStatus,
      dsNumber: dossiersDemarchesSimplifiees.dsNumber,
      dsStatus: dossiersDemarchesSimplifiees.dsStatus,
      dsUpdatedAt: dossiersDemarchesSimplifiees.updatedAt,
      dsCreatedAt: dossiersDemarchesSimplifiees.createdAt,
      dsUrl: dossiersDemarchesSimplifiees.dsUrl,
      email: users.email,
    })
    .from(parcoursPrevention)
    .innerJoin(
      dossiersDemarchesSimplifiees,
      and(
        eq(dossiersDemarchesSimplifiees.parcoursId, parcoursPrevention.id),
        eq(dossiersDemarchesSimplifiees.step, parcoursPrevention.currentStep)
      )
    )
    .innerJoin(users, eq(users.id, parcoursPrevention.userId))
    .where(
      and(
        isNull(parcoursPrevention.archivedAt),
        isNull(parcoursPrevention.completedAt),
        inArray(dossiersDemarchesSimplifiees.dsStatus, TARGET_STATUSES)
      )
    )
    .orderBy(desc(dossiersDemarchesSimplifiees.updatedAt));

  // Filtre d'ancienneté éventuel.
  // Âge = depuis la CRÉATION du dossier (updated_at est bruité par les syncs).
  const blocked = rows
    .map((r) => ({ ...r, ageDays: ageDays(r.dsCreatedAt) }))
    .filter((r) => !OLDER_THAN_DAYS || (r.ageDays ?? 0) > OLDER_THAN_DAYS);

  console.log(`Total bloqués : ${blocked.length}\n`);

  // --- Répartition par étape × statut × ancienneté ---
  const byStepStatus = new Map<string, number>();
  const byBucket = new Map<string, number>();
  for (const r of blocked) {
    const key = `${STEP_LABELS[r.step] ?? r.step} / ${r.dsStatus}`;
    byStepStatus.set(key, (byStepStatus.get(key) ?? 0) + 1);
    const b = ageBucket(r.ageDays);
    byBucket.set(b, (byBucket.get(b) ?? 0) + 1);
  }
  console.log("Par étape / statut :");
  for (const [k, n] of [...byStepStatus.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(32)} ${n}`);
  }
  console.log("\nPar ancienneté (depuis création) :");
  for (const b of ["<=7j", ">7j", ">30j", ">90j", "inconnu"]) {
    if (byBucket.get(b)) console.log(`  ${b.padEnd(10)} ${byBucket.get(b)}`);
  }

  // --- Cross-check DS ---
  const csvLines: string[] = [
    "parcoursId,step,internalStatus,dsNumber,dsStatus,createdAt,ageDays,dsUrlKind,email,dsState,classification",
  ];
  if (CHECK_DS) {
    console.log("\n=== Cross-check DS (--check-ds) ===");
    const byClass = new Map<string, number>();
    for (const r of blocked) {
      const dsNum = r.dsNumber ? Number(r.dsNumber) : null;
      const ds = dsNum ? await getDossierState(dsNum) : { error: "ds_number_absent" };
      const cls = dsNum ? classify(r.dsStatus, ds) : "ds_number_absent";
      byClass.set(cls, (byClass.get(cls) ?? 0) + 1);
      csvLines.push(
        [
          r.parcoursId,
          r.step,
          r.internalStatus,
          r.dsNumber ?? "",
          r.dsStatus,
          fmtDate(r.dsCreatedAt),
          r.ageDays ?? "",
          dsUrlKind(r.dsUrl),
          redactEmail(r.email),
          ds.state ?? ds.error ?? "",
          cls,
        ].join(",")
      );
      await new Promise((res) => setTimeout(res, 120)); // ménage l'API DS
    }
    console.log("\nRépartition (drop-off vs désync vs DS KO) :");
    for (const [k, n] of [...byClass.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k.padEnd(24)} ${n}`);
    }
    console.log(
      "\nLecture : `jamais_depose` = usager n'a pas déposé (pas un bug) ; `desync*` = DS plus avancé que nous (bug à corriger) ; `ds_supprime`/`ds_inaccessible` = démarche test/permission (cf. ADR-0009)."
    );
  } else {
    for (const r of blocked) {
      csvLines.push(
        [
          r.parcoursId,
          r.step,
          r.internalStatus,
          r.dsNumber ?? "",
          r.dsStatus,
          fmtDate(r.dsCreatedAt),
          r.ageDays ?? "",
          dsUrlKind(r.dsUrl),
          redactEmail(r.email),
          "",
          "",
        ].join(",")
      );
    }
  }

  if (CSV_PATH) {
    writeFileSync(CSV_PATH, csvLines.join("\n"), "utf-8");
    console.log(`\nCSV écrit : ${CSV_PATH} (${blocked.length} lignes)`);
  }

  await client.end();
}

main().catch(async (err) => {
  console.error("Erreur:", err);
  await client.end();
  process.exit(1);
});
