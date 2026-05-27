/**
 * Correction du bug "double-progression AMO".
 *
 * Contexte : cf docs/parcours/INCIDENT-double-progression-amo.md
 * Deux appels concurrents à `approveValidation` pouvaient faire avancer un parcours
 * de deux étapes en cascade (CHOIX_AMO → ELIGIBILITE → DIAGNOSTIC) sans qu'aucun
 * dossier DS d'éligibilité ne soit créé. Résultat : parcours en diagnostic/devis/factures
 * sans ligne `dossiers_demarches_simplifiees` step='eligibilite'.
 *
 * Ce script DÉTECTE lui-même les cas (même critère que l'audit) et les corrige en
 * ramenant le parcours à ELIGIBILITE/TODO. Pas de mapping JSON intermédiaire.
 *
 * Catégorisation de chaque parcours problématique :
 *   1. REGRESSABLE        : aucun dossier DS du tout → simple régression.
 *   2. CLEANUP_REQUIS     : dossiers downstream UNIQUEMENT en_construction (brouillons
 *                           DS jamais soumis, résidus du bug — ex. l'utilisateur a cliqué
 *                           "Créer mon dossier diagnostic"). Régression possible APRÈS
 *                           suppression de ces brouillons. Nécessite --with-cleanup.
 *   3. A_REVIEWER         : au moins un dossier downstream SOUMIS (en_instruction/accepte/
 *                           refuse/...). Jamais touché automatiquement — vraie donnée en jeu.
 *
 * Niveaux d'engagement :
 *   (rien)                 dry-run : affiche le plan, aucune écriture
 *   --apply                corrige la catégorie 1 (régression). Catégorie 2 affichée, pas touchée.
 *   --apply --with-cleanup corrige aussi la catégorie 2 (DELETE brouillons en_construction
 *                          downstream + régression, en transaction).
 *
 * Filtres :
 *   --parcours-id=<uuid>   limite à un seul parcours (debug / cas isolé type "Edouard").
 *
 * La régression est un UPDATE conditionnel sur `current_step IN (diagnostic,devis,factures)`
 * pour ne pas écraser un changement concurrent survenu entre la détection et l'apply.
 *
 * Usage :
 *   pnpm tsx scripts/ops/fix-double-progression-amo.ts                          # dry-run
 *   pnpm tsx scripts/ops/fix-double-progression-amo.ts --apply                  # cat. 1
 *   pnpm tsx scripts/ops/fix-double-progression-amo.ts --apply --with-cleanup   # cat. 1 + 2
 *   pnpm tsx scripts/ops/fix-double-progression-amo.ts --parcours-id=<uuid>     # cible
 *
 * Prérequis : .env.local avec DATABASE_URL (les DEMARCHES_SIMPLIFIEES_* ne sont pas requis,
 * ce script ne touche pas à l'API DS).
 */

import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq, inArray, isNull } from "drizzle-orm";
import * as schema from "@/shared/database/schema";
import { parcoursPrevention, users, dossiersDemarchesSimplifiees } from "@/shared/database/schema";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";

// --- Args ---
const args = process.argv.slice(2);
function getArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = args.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}
const APPLY = args.includes("--apply");
const WITH_CLEANUP = args.includes("--with-cleanup");
const PARCOURS_ID_FILTER = getArg("parcours-id");

if (WITH_CLEANUP && !APPLY) {
  console.error("--with-cleanup nécessite --apply (rien à nettoyer en dry-run).");
  process.exit(1);
}

// --- DB ---
const connectionString =
  process.env.DATABASE_URL ??
  (() => {
    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;
    if (!DB_HOST) throw new Error("DATABASE_URL ou DB_HOST requis");
    return `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
  })();
const client = postgres(connectionString, { max: 5, idle_timeout: 10 });
const db = drizzle(client, { schema });

// --- Constantes métier ---
// Étapes en aval de l'éligibilité : un parcours qui y est sans dossier d'éligibilité
// est un candidat au bug de double-progression.
const STEPS_AVALES: Step[] = [Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES];
const TARGET_STEP = Step.ELIGIBILITE;
const TARGET_STATUS = Status.TODO;

type Category = "regressable" | "cleanup_requis" | "a_reviewer";

interface LocalDossier {
  id: string;
  step: Step;
  dsStatus: DSStatus;
  dsNumber: string | null;
}

interface Case {
  parcoursId: string;
  email: string | null;
  currentStep: Step;
  currentStatus: Status;
  dossiers: LocalDossier[];
  category: Category;
  // Brouillons en_construction downstream à supprimer (catégorie cleanup_requis).
  enConstructionToDelete: { id: string; step: Step }[];
  reviewReason?: string;
}

async function categorize(): Promise<Case[]> {
  const whereClauses = [
    inArray(parcoursPrevention.currentStep, STEPS_AVALES),
    isNull(parcoursPrevention.archivedAt),
    isNull(parcoursPrevention.completedAt),
  ];
  if (PARCOURS_ID_FILTER) {
    whereClauses.push(eq(parcoursPrevention.id, PARCOURS_ID_FILTER));
  }

  const candidates = await db
    .select({
      id: parcoursPrevention.id,
      currentStep: parcoursPrevention.currentStep,
      currentStatus: parcoursPrevention.currentStatus,
      email: users.email,
    })
    .from(parcoursPrevention)
    .innerJoin(users, eq(parcoursPrevention.userId, users.id))
    .where(and(...whereClauses));

  const cases: Case[] = [];

  for (const c of candidates) {
    const dossiers = (await db
      .select({
        id: dossiersDemarchesSimplifiees.id,
        step: dossiersDemarchesSimplifiees.step,
        dsStatus: dossiersDemarchesSimplifiees.dsStatus,
        dsNumber: dossiersDemarchesSimplifiees.dsNumber,
      })
      .from(dossiersDemarchesSimplifiees)
      .where(eq(dossiersDemarchesSimplifiees.parcoursId, c.id))) as LocalDossier[];

    // Si un dossier d'éligibilité existe, ce n'est PAS un cas du bug : le parcours a
    // bien franchi l'éligibilité. (Cas "groupe A" = utilisateur passif, géré par l'audit.)
    if (dossiers.some((d) => d.step === Step.ELIGIBILITE)) {
      continue;
    }

    let category: Category;
    let enConstructionToDelete: { id: string; step: Step }[] = [];
    let reviewReason: string | undefined;

    if (dossiers.length === 0) {
      category = "regressable";
    } else if (dossiers.every((d) => d.dsStatus === DSStatus.EN_CONSTRUCTION)) {
      category = "cleanup_requis";
      enConstructionToDelete = dossiers.map((d) => ({ id: d.id, step: d.step }));
    } else {
      category = "a_reviewer";
      const soumis = dossiers.filter((d) => d.dsStatus !== DSStatus.EN_CONSTRUCTION);
      reviewReason = `dossier(s) downstream soumis côté DS : ${soumis
        .map((d) => `${d.step}=${d.dsStatus}`)
        .join(", ")}`;
    }

    cases.push({
      parcoursId: c.id,
      email: c.email,
      currentStep: c.currentStep as Step,
      currentStatus: c.currentStatus as Status,
      dossiers,
      category,
      enConstructionToDelete,
      reviewReason,
    });
  }

  return cases;
}

async function regresser(parcoursId: string): Promise<boolean> {
  const [moved] = await db
    .update(parcoursPrevention)
    .set({ currentStep: TARGET_STEP, currentStatus: TARGET_STATUS })
    .where(
      and(
        eq(parcoursPrevention.id, parcoursId),
        inArray(parcoursPrevention.currentStep, STEPS_AVALES)
      )
    )
    .returning({ id: parcoursPrevention.id });
  return !!moved;
}

async function cleanupAndRegresser(c: Case): Promise<boolean> {
  return await db.transaction(async (tx) => {
    // Suppression conditionnelle : uniquement les brouillons en_construction.
    // La condition ds_status=en_construction protège contre une soumission survenue
    // entre la détection et l'apply.
    for (const d of c.enConstructionToDelete) {
      await tx
        .delete(dossiersDemarchesSimplifiees)
        .where(
          and(
            eq(dossiersDemarchesSimplifiees.id, d.id),
            eq(dossiersDemarchesSimplifiees.dsStatus, DSStatus.EN_CONSTRUCTION)
          )
        );
    }

    const [moved] = await tx
      .update(parcoursPrevention)
      .set({ currentStep: TARGET_STEP, currentStatus: TARGET_STATUS })
      .where(
        and(
          eq(parcoursPrevention.id, c.parcoursId),
          inArray(parcoursPrevention.currentStep, STEPS_AVALES)
        )
      )
      .returning({ id: parcoursPrevention.id });

    return !!moved;
  });
}

function dossierLine(d: LocalDossier): string {
  return `${d.step}=${d.dsStatus}${d.dsNumber ? ` (#${d.dsNumber})` : ""}`;
}

async function main() {
  console.log("=".repeat(72));
  console.log(
    `FIX DOUBLE-PROGRESSION AMO — ${
      APPLY ? (WITH_CLEANUP ? "APPLY + CLEANUP" : "APPLY") : "DRY-RUN"
    }`
  );
  console.log("=".repeat(72));
  console.log(`Cible : régression vers ${TARGET_STEP}/${TARGET_STATUS}`);
  if (PARCOURS_ID_FILTER) console.log(`Filtre parcours-id : ${PARCOURS_ID_FILTER}`);
  console.log();

  const cases = await categorize();

  const regressables = cases.filter((c) => c.category === "regressable");
  const cleanupRequis = cases.filter((c) => c.category === "cleanup_requis");
  const aReviewer = cases.filter((c) => c.category === "a_reviewer");

  // --- Affichage du plan ---
  console.log(`Parcours problématiques détectés : ${cases.length}`);
  console.log(`  - régressables (0 dossier)        : ${regressables.length}`);
  console.log(`  - cleanup requis (en_construction): ${cleanupRequis.length}`);
  console.log(`  - à reviewer (dossier soumis)     : ${aReviewer.length}`);
  console.log();

  if (regressables.length > 0) {
    console.log("--- RÉGRESSABLES (catégorie 1) ---");
    for (const c of regressables) {
      console.log(`  [${c.parcoursId}] ${c.email ?? "<sans email>"} — ${c.currentStep}/${c.currentStatus} → ${TARGET_STEP}/${TARGET_STATUS}`);
    }
    console.log();
  }

  if (cleanupRequis.length > 0) {
    console.log("--- CLEANUP REQUIS (catégorie 2 — type \"Edouard\") ---");
    for (const c of cleanupRequis) {
      console.log(`  [${c.parcoursId}] ${c.email ?? "<sans email>"} — ${c.currentStep}/${c.currentStatus}`);
      console.log(`      dossiers à supprimer : ${c.dossiers.map(dossierLine).join(", ")}`);
      console.log(`      → DELETE brouillon(s) + régression à ${TARGET_STEP}/${TARGET_STATUS}`);
    }
    if (!WITH_CLEANUP) {
      console.log(`  (relancer avec --apply --with-cleanup pour traiter ces ${cleanupRequis.length} cas)`);
    }
    console.log();
  }

  if (aReviewer.length > 0) {
    console.log("--- À REVIEWER MANUELLEMENT (catégorie 3 — jamais touché auto) ---");
    for (const c of aReviewer) {
      console.log(`  [${c.parcoursId}] ${c.email ?? "<sans email>"} — ${c.currentStep}/${c.currentStatus}`);
      console.log(`      ${c.reviewReason}`);
      console.log(`      dossiers : ${c.dossiers.map(dossierLine).join(", ")}`);
    }
    console.log();
  }

  if (cases.length === 0) {
    console.log("Aucun cas détecté. Rien à faire.");
    await client.end();
    return;
  }

  if (!APPLY) {
    console.log("Mode dry-run — aucune écriture. Relancer avec --apply pour corriger.");
    await client.end();
    return;
  }

  // --- Exécution ---
  console.log("=".repeat(72));
  console.log("EXÉCUTION");
  console.log("=".repeat(72));

  let okRegress = 0;
  let okCleanup = 0;
  let failed = 0;
  let skippedState = 0;

  for (const c of regressables) {
    try {
      const moved = await regresser(c.parcoursId);
      if (moved) {
        okRegress++;
        console.log(`  OK régressé  ${c.parcoursId}`);
      } else {
        skippedState++;
        console.log(`  SKIP (état modifié depuis la détection) ${c.parcoursId}`);
      }
    } catch (err) {
      failed++;
      console.error(`  ERR ${c.parcoursId} : ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (WITH_CLEANUP) {
    for (const c of cleanupRequis) {
      try {
        const moved = await cleanupAndRegresser(c);
        if (moved) {
          okCleanup++;
          console.log(`  OK cleanup+régressé ${c.parcoursId} (${c.enConstructionToDelete.length} brouillon(s) supprimé(s))`);
        } else {
          skippedState++;
          console.log(`  SKIP (état modifié depuis la détection) ${c.parcoursId}`);
        }
      } catch (err) {
        failed++;
        console.error(`  ERR ${c.parcoursId} : ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } else if (cleanupRequis.length > 0) {
    console.log(`  ${cleanupRequis.length} cas cleanup ignorés (--with-cleanup non fourni)`);
  }

  console.log();
  console.log("=".repeat(72));
  console.log(
    `Terminé : ${okRegress} régressé(s), ${okCleanup} cleanup+régressé(s), ${skippedState} skip (état), ${failed} échec(s), ${aReviewer.length} à reviewer.`
  );
  console.log("=".repeat(72));

  await client.end();
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  client.end();
  process.exit(1);
});
