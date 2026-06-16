import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/shared/database/client";
import { parcoursPrevention, dossiersDemarchesSimplifiees, users, syncRunEntries } from "@/shared/database/schema";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { ParcoursAnomalyType, type AnomalyRow, type AnomaliesResult } from "../domain/diagnostics.types";

/**
 * Détection EN BASE des parcours en anomalie DS (aucun appel à Démarches Simplifiées).
 * Le cross-check DS live est réservé au détail d'un parcours (voir actions).
 */

const DAY_MS = 1000 * 60 * 60 * 24;
function ageDays(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / DAY_MS);
}

// Étapes "avancées" : y être implique que l'éligibilité a été acceptée.
const STEPS_AVANCEES: Step[] = [Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES];
const STATUTS_BLOQUANTS: DSStatus[] = [DSStatus.EN_CONSTRUCTION, DSStatus.EN_INSTRUCTION];

const userCols = {
  userId: parcoursPrevention.userId,
  userNom: users.nom,
  userPrenom: users.prenom,
  userEmail: users.email,
};

/** Dossiers de l'étape courante déposés (en construction / en instruction) qui n'avancent pas. */
async function findBloques(): Promise<AnomalyRow[]> {
  const rows = await db
    .select({
      parcoursId: parcoursPrevention.id,
      currentStep: parcoursPrevention.currentStep,
      currentStatus: parcoursPrevention.currentStatus,
      dsNumber: dossiersDemarchesSimplifiees.dsNumber,
      dsStatus: dossiersDemarchesSimplifiees.dsStatus,
      submittedAt: dossiersDemarchesSimplifiees.submittedAt,
      lastSyncAt: dossiersDemarchesSimplifiees.lastSyncAt,
      dossierCreatedAt: dossiersDemarchesSimplifiees.createdAt,
      ...userCols,
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
        inArray(dossiersDemarchesSimplifiees.dsStatus, STATUTS_BLOQUANTS)
      )
    )
    .orderBy(desc(dossiersDemarchesSimplifiees.createdAt));

  return rows.map((r) => ({
    type: ParcoursAnomalyType.BLOQUE,
    parcoursId: r.parcoursId,
    userId: r.userId,
    userNom: r.userNom,
    userPrenom: r.userPrenom,
    userEmail: r.userEmail,
    currentStep: r.currentStep,
    currentStatus: r.currentStatus,
    dsNumber: r.dsNumber,
    dsStatus: r.dsStatus,
    submittedAt: r.submittedAt,
    lastSyncAt: r.lastSyncAt,
    ageDays: ageDays(r.dossierCreatedAt),
    detail: null,
  }));
}

/** Parcours à une étape avancée sans dossier d'éligibilité accepté (dossier perdu / désync). */
async function findOrphelins(): Promise<AnomalyRow[]> {
  const elig = alias(dossiersDemarchesSimplifiees, "elig");

  const rows = await db
    .select({
      parcoursId: parcoursPrevention.id,
      currentStep: parcoursPrevention.currentStep,
      currentStatus: parcoursPrevention.currentStatus,
      parcoursCreatedAt: parcoursPrevention.createdAt,
      ...userCols,
    })
    .from(parcoursPrevention)
    .innerJoin(users, eq(users.id, parcoursPrevention.userId))
    .leftJoin(
      elig,
      and(
        eq(elig.parcoursId, parcoursPrevention.id),
        eq(elig.step, Step.ELIGIBILITE),
        eq(elig.dsStatus, DSStatus.ACCEPTE)
      )
    )
    .where(
      and(
        isNull(parcoursPrevention.archivedAt),
        isNull(parcoursPrevention.completedAt),
        inArray(parcoursPrevention.currentStep, STEPS_AVANCEES),
        isNull(elig.id)
      )
    )
    .orderBy(desc(parcoursPrevention.createdAt));

  return rows.map((r) => ({
    type: ParcoursAnomalyType.ORPHELIN,
    parcoursId: r.parcoursId,
    userId: r.userId,
    userNom: r.userNom,
    userPrenom: r.userPrenom,
    userEmail: r.userEmail,
    currentStep: r.currentStep,
    currentStatus: r.currentStatus,
    dsNumber: null,
    dsStatus: null,
    submittedAt: null,
    lastSyncAt: null,
    ageDays: ageDays(r.parcoursCreatedAt),
    detail: "Aucun dossier d'éligibilité accepté rattaché",
  }));
}

/** Parcours actifs dont la dernière entrée de sync porte une erreur. */
async function findSyncErreurs(): Promise<AnomalyRow[]> {
  const rows = await db
    .select({
      parcoursId: parcoursPrevention.id,
      currentStep: parcoursPrevention.currentStep,
      currentStatus: parcoursPrevention.currentStatus,
      error: syncRunEntries.error,
      entryCreatedAt: syncRunEntries.createdAt,
      ...userCols,
    })
    .from(syncRunEntries)
    .innerJoin(parcoursPrevention, eq(parcoursPrevention.id, syncRunEntries.parcoursId))
    .innerJoin(users, eq(users.id, parcoursPrevention.userId))
    .where(
      and(
        isNotNull(syncRunEntries.error),
        isNull(parcoursPrevention.archivedAt),
        isNull(parcoursPrevention.completedAt)
      )
    )
    .orderBy(desc(syncRunEntries.createdAt));

  // Dédoublonnage : on ne garde que la dernière erreur par parcours (lignes déjà triées desc).
  const seen = new Set<string>();
  const result: AnomalyRow[] = [];
  for (const r of rows) {
    if (seen.has(r.parcoursId)) continue;
    seen.add(r.parcoursId);
    result.push({
      type: ParcoursAnomalyType.SYNC_ERREUR,
      parcoursId: r.parcoursId,
      userId: r.userId,
      userNom: r.userNom,
      userPrenom: r.userPrenom,
      userEmail: r.userEmail,
      currentStep: r.currentStep,
      currentStatus: r.currentStatus,
      dsNumber: null,
      dsStatus: null,
      submittedAt: null,
      lastSyncAt: r.entryCreatedAt,
      ageDays: ageDays(r.entryCreatedAt),
      detail: r.error,
    });
  }
  return result;
}

export async function detectAnomalies(): Promise<AnomaliesResult> {
  const [bloques, orphelins, syncErreurs] = await Promise.all([findBloques(), findOrphelins(), findSyncErreurs()]);

  const rows = [...bloques, ...orphelins, ...syncErreurs];

  return {
    rows,
    counts: {
      [ParcoursAnomalyType.BLOQUE]: bloques.length,
      [ParcoursAnomalyType.ORPHELIN]: orphelins.length,
      [ParcoursAnomalyType.SYNC_ERREUR]: syncErreurs.length,
    },
    generatedAt: new Date().toISOString(),
  };
}
