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
 *   2. CLEANUP_REQUIS     : dossiers downstream UNIQUEMENT sans statut DS (brouillons
 *                           jamais déposés, résidus du bug — ex. l'utilisateur a cliqué
 *                           "Créer mon dossier diagnostic"). Régression possible APRÈS
 *                           suppression de ces brouillons. Nécessite --with-cleanup.
 *   3. A_REVIEWER         : au moins un dossier downstream DÉPOSÉ (en_construction depuis
 *                           ADR-0009, en_instruction, accepte…). Jamais touché automatiquement.
 *
 * Niveaux d'engagement :
 *   (rien)                 dry-run : affiche le plan, aucune écriture
 *   --apply                corrige la catégorie 1 (régression). Catégorie 2 affichée, pas touchée.
 *   --apply --with-cleanup corrige aussi la catégorie 2 (DELETE des brouillons sans statut DS
 *                          downstream + régression, en transaction).
 *
 * Filtres / options :
 *   --parcours-id=<uuid>   limite à un seul parcours (debug / cas isolé type "Edouard").
 *   --anonymize            masque les PII (id, email, ds_number) dans l'affichage, pour
 *                          partager le plan sans exposer les identifiants.
 *
 * La régression est un UPDATE conditionnel sur `current_step IN (diagnostic,devis,factures)`
 * pour ne pas écraser un changement concurrent survenu entre la détection et l'apply.
 *
 * Usage :
 *   pnpm fix:double-progression                          # dry-run
 *   pnpm fix:double-progression --anonymize              # dry-run anonymisé
 *   pnpm fix:double-progression --apply                  # cat. 1
 *   pnpm fix:double-progression --apply --with-cleanup   # cat. 1 + 2
 *   pnpm fix:double-progression --parcours-id=<uuid>     # cible
 *
 * Prérequis : .env.local avec DATABASE_URL (les DEMARCHES_SIMPLIFIEES_* ne sont pas requis,
 * ce script ne touche pas à l'API DS).
 */

import { and, eq, inArray, isNull } from "drizzle-orm";
import { createOpsDb } from "../lib/db";
import { createRedactor } from "../lib/anonymize";
import { parcoursPrevention, users, dossiersDemarchesSimplifiees } from "@/shared/database/schema";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { Status } from "@/shared/domain/value-objects/status.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { categorizeDoubleProgression } from "../lib/double-progression";
import { getArg, hasFlag } from "../lib/args";

// --- Args ---
const APPLY = hasFlag("apply");
const WITH_CLEANUP = hasFlag("with-cleanup");
const ANONYMIZE = hasFlag("anonymize");
const PARCOURS_ID_FILTER = getArg("parcours-id");

if (WITH_CLEANUP && !APPLY) {
  console.error("--with-cleanup nécessite --apply (rien à nettoyer en dry-run).");
  process.exit(1);
}

// --- Anonymisation (affichages masqués ; les vraies valeurs restent utilisées en interne) ---
const { redactUuid, redactEmail, redactDsNumber } = createRedactor(ANONYMIZE);

// --- DB ---
const { db, client } = createOpsDb();

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
  dsStatus: DSStatus | null;
  dsNumber: string | null;
}

interface Case {
  parcoursId: string;
  email: string | null;
  currentStep: Step;
  currentStatus: Status;
  dossiers: LocalDossier[];
  category: Category;
  // Brouillons downstream jamais déposés à supprimer (catégorie cleanup_requis).
  brouillonsToDelete: { id: string; step: Step }[];
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

    // Catégorisation partagée avec l'audit (cf. lib/double-progression.ts).
    const fullCategory = categorizeDoubleProgression(dossiers);

    // Cas "légitime" (a franchi l'éligibilité) : pas un bug, le fix n'y touche pas.
    if (fullCategory === "legitime") {
      continue;
    }

    const category: Category = fullCategory;
    let brouillonsToDelete: { id: string; step: Step }[] = [];
    let reviewReason: string | undefined;

    if (category === "cleanup_requis") {
      brouillonsToDelete = dossiers.map((d) => ({ id: d.id, step: d.step }));
    } else if (category === "a_reviewer") {
      const deposes = dossiers.filter((d) => d.dsStatus !== null);
      reviewReason = `dossier(s) downstream déposé(s) côté DS : ${deposes
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
      brouillonsToDelete,
      reviewReason,
    });
  }

  return cases;
}

async function regresser(parcoursId: string): Promise<boolean> {
  const [moved] = await db
    .update(parcoursPrevention)
    .set({ currentStep: TARGET_STEP, currentStatus: TARGET_STATUS })
    .where(and(eq(parcoursPrevention.id, parcoursId), inArray(parcoursPrevention.currentStep, STEPS_AVALES)))
    .returning({ id: parcoursPrevention.id });
  return !!moved;
}

// Lancée dans la transaction pour l'annuler : suppression et régression vont ensemble ou pas du tout.
class EtatModifieError extends Error {}

async function cleanupAndRegresser(c: Case): Promise<void> {
  await db.transaction(async (tx) => {
    // ds_status NULL = jamais déposé (ADR-0009) ; un dépôt survenu depuis la détection l'exclut.
    let supprimes = 0;
    for (const d of c.brouillonsToDelete) {
      const deleted = await tx
        .delete(dossiersDemarchesSimplifiees)
        .where(and(eq(dossiersDemarchesSimplifiees.id, d.id), isNull(dossiersDemarchesSimplifiees.dsStatus)))
        .returning({ id: dossiersDemarchesSimplifiees.id });
      supprimes += deleted.length;
    }
    if (supprimes !== c.brouillonsToDelete.length) {
      throw new EtatModifieError(`${supprimes}/${c.brouillonsToDelete.length} brouillon(s) encore supprimable(s)`);
    }

    const [moved] = await tx
      .update(parcoursPrevention)
      .set({ currentStep: TARGET_STEP, currentStatus: TARGET_STATUS })
      .where(and(eq(parcoursPrevention.id, c.parcoursId), inArray(parcoursPrevention.currentStep, STEPS_AVALES)))
      .returning({ id: parcoursPrevention.id });
    if (!moved) throw new EtatModifieError("étape modifiée");
  });
}

function dossierLine(d: LocalDossier): string {
  return `${d.step}=${d.dsStatus}${d.dsNumber ? ` (${redactDsNumber(d.dsNumber)})` : ""}`;
}

async function main() {
  console.log("=".repeat(72));
  console.log(
    `FIX DOUBLE-PROGRESSION AMO — ${
      APPLY ? (WITH_CLEANUP ? "APPLY + CLEANUP" : "APPLY") : "DRY-RUN"
    }${ANONYMIZE ? " (anonymisé)" : ""}`
  );
  console.log("=".repeat(72));
  console.log(`Cible : régression vers ${TARGET_STEP}/${TARGET_STATUS}`);
  if (PARCOURS_ID_FILTER) console.log(`Filtre parcours-id : ${redactUuid(PARCOURS_ID_FILTER)}`);
  console.log();

  const cases = await categorize();

  const regressables = cases.filter((c) => c.category === "regressable");
  const cleanupRequis = cases.filter((c) => c.category === "cleanup_requis");
  const aReviewer = cases.filter((c) => c.category === "a_reviewer");

  // --- Affichage du plan ---
  console.log(`Parcours problématiques détectés : ${cases.length}`);
  console.log(`  - régressables (0 dossier)        : ${regressables.length}`);
  console.log(`  - cleanup requis (brouillons)     : ${cleanupRequis.length}`);
  console.log(`  - à reviewer (dossier déposé)     : ${aReviewer.length}`);
  console.log();

  if (regressables.length > 0) {
    console.log("--- RÉGRESSABLES (catégorie 1) ---");
    for (const c of regressables) {
      console.log(
        `  [${redactUuid(c.parcoursId)}] ${redactEmail(c.email)} — ${c.currentStep}/${c.currentStatus} → ${TARGET_STEP}/${TARGET_STATUS}`
      );
    }
    console.log();
  }

  if (cleanupRequis.length > 0) {
    console.log('--- CLEANUP REQUIS (catégorie 2 — type "Edouard") ---');
    for (const c of cleanupRequis) {
      console.log(`  [${redactUuid(c.parcoursId)}] ${redactEmail(c.email)} — ${c.currentStep}/${c.currentStatus}`);
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
      console.log(`  [${redactUuid(c.parcoursId)}] ${redactEmail(c.email)} — ${c.currentStep}/${c.currentStatus}`);
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
        console.log(`  OK régressé  ${redactUuid(c.parcoursId)}`);
      } else {
        skippedState++;
        console.log(`  SKIP (état modifié depuis la détection) ${redactUuid(c.parcoursId)}`);
      }
    } catch (err) {
      failed++;
      console.error(`  ERR ${redactUuid(c.parcoursId)} : ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (WITH_CLEANUP) {
    for (const c of cleanupRequis) {
      try {
        await cleanupAndRegresser(c);
        okCleanup++;
        console.log(
          `  OK cleanup+régressé ${redactUuid(c.parcoursId)} (${c.brouillonsToDelete.length} brouillon(s) supprimé(s))`
        );
      } catch (err) {
        if (err instanceof EtatModifieError) {
          skippedState++;
          console.log(`  SKIP (état modifié depuis la détection : ${err.message}) ${redactUuid(c.parcoursId)}`);
          continue;
        }
        failed++;
        console.error(`  ERR ${redactUuid(c.parcoursId)} : ${err instanceof Error ? err.message : String(err)}`);
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
