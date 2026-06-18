import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/shared/database/client";
import { parcoursPrevention, dossiersDemarchesSimplifiees, users, syncRunEntries } from "@/shared/database/schema";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import {
  DiagnosticState,
  DIAGNOSTIC_STATE_ORDER,
  SEUIL_BLOQUE_JOURS,
  type DiagnosticRow,
  type DiagnosticsResult,
} from "../domain/diagnostics.types";

/**
 * Classifie EN BASE (aucun appel DN) chaque parcours actif selon le dossier de son étape
 * courante + l'historique de sync. Un parcours = un état (priorité aux anomalies).
 */

const DAY_MS = 1000 * 60 * 60 * 24;
function ageDays(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / DAY_MS);
}

const STEPS_AVANCEES: Step[] = [Step.DIAGNOSTIC, Step.DEVIS, Step.FACTURES];

interface RawRow {
  parcoursId: string;
  userId: string;
  currentStep: Step;
  currentStatus: DiagnosticRow["currentStatus"];
  parcoursCreatedAt: Date;
  dossierId: string | null;
  dsNumber: string | null;
  dsStatus: DSStatus | null;
  submittedAt: Date | null;
  instructedAt: Date | null;
  lastSyncAt: Date | null;
  dossierCreatedAt: Date | null;
  eligAccepteId: string | null;
  userNom: string | null;
  userPrenom: string | null;
  userEmail: string | null;
}

function classify(r: RawRow, syncError: string | undefined): DiagnosticState {
  if (syncError) {
    // Dépôt RÉELLEMENT confirmé par une sync (last_sync_at renseigné) mais jamais instruit
    // → dossier DN vraisemblablement expiré/supprimé. On exige last_sync_at car un
    // `submitted_at` sans sync est un faux dépôt legacy (création pré-#216), pas un vrai dépôt.
    if (r.dossierId && r.lastSyncAt && r.submittedAt && !r.instructedAt) return DiagnosticState.SYNC_ERREUR_DEPOSE;
    return DiagnosticState.SYNC_ERREUR;
  }

  // Pas de dossier pour l'étape courante.
  if (!r.dossierId) {
    if (STEPS_AVANCEES.includes(r.currentStep) && !r.eligAccepteId) return DiagnosticState.ORPHELIN;
    return DiagnosticState.SANS_DOSSIER;
  }

  if (r.dsNumber && !r.lastSyncAt) return DiagnosticState.JAMAIS_SYNCHRONISE;

  switch (r.dsStatus) {
    case DSStatus.EN_CONSTRUCTION: {
      // Déposé = submitted_at renseigné (cf. ADR-0012) ; sinon brouillon.
      if (!r.submittedAt) return DiagnosticState.BROUILLON;
      const days = ageDays(r.submittedAt) ?? 0;
      return days >= SEUIL_BLOQUE_JOURS ? DiagnosticState.BLOQUE : DiagnosticState.DEPOSE_EN_ATTENTE;
    }
    case DSStatus.EN_INSTRUCTION:
      return DiagnosticState.EN_INSTRUCTION;
    case DSStatus.ACCEPTE:
      return DiagnosticState.ACCEPTE;
    case DSStatus.REFUSE:
      return DiagnosticState.REFUSE;
    case DSStatus.CLASSE_SANS_SUITE:
      return DiagnosticState.CLASSE_SANS_SUITE;
    default:
      // null / non_accessible : créé non déposé.
      return DiagnosticState.BROUILLON;
  }
}

function referenceDate(state: DiagnosticState, r: RawRow): Date | null {
  switch (state) {
    case DiagnosticState.SYNC_ERREUR_DEPOSE:
    case DiagnosticState.BLOQUE:
    case DiagnosticState.DEPOSE_EN_ATTENTE:
      return r.submittedAt ?? r.dossierCreatedAt;
    case DiagnosticState.EN_INSTRUCTION:
      return r.instructedAt ?? r.dossierCreatedAt;
    case DiagnosticState.ORPHELIN:
    case DiagnosticState.SANS_DOSSIER:
      return r.parcoursCreatedAt;
    default:
      return r.dossierCreatedAt ?? r.parcoursCreatedAt;
  }
}

export async function getParcoursDiagnostics(): Promise<DiagnosticsResult> {
  const elig = alias(dossiersDemarchesSimplifiees, "elig");

  const rows = (await db
    .select({
      parcoursId: parcoursPrevention.id,
      userId: parcoursPrevention.userId,
      currentStep: parcoursPrevention.currentStep,
      currentStatus: parcoursPrevention.currentStatus,
      parcoursCreatedAt: parcoursPrevention.createdAt,
      dossierId: dossiersDemarchesSimplifiees.id,
      dsNumber: dossiersDemarchesSimplifiees.dsNumber,
      dsStatus: dossiersDemarchesSimplifiees.dsStatus,
      submittedAt: dossiersDemarchesSimplifiees.submittedAt,
      instructedAt: dossiersDemarchesSimplifiees.instructedAt,
      lastSyncAt: dossiersDemarchesSimplifiees.lastSyncAt,
      dossierCreatedAt: dossiersDemarchesSimplifiees.createdAt,
      eligAccepteId: elig.id,
      userNom: users.nom,
      userPrenom: users.prenom,
      userEmail: users.email,
    })
    .from(parcoursPrevention)
    .innerJoin(users, eq(users.id, parcoursPrevention.userId))
    .leftJoin(
      dossiersDemarchesSimplifiees,
      and(
        eq(dossiersDemarchesSimplifiees.parcoursId, parcoursPrevention.id),
        eq(dossiersDemarchesSimplifiees.step, parcoursPrevention.currentStep)
      )
    )
    .leftJoin(
      elig,
      and(
        eq(elig.parcoursId, parcoursPrevention.id),
        eq(elig.step, Step.ELIGIBILITE),
        eq(elig.dsStatus, DSStatus.ACCEPTE)
      )
    )
    .where(and(isNull(parcoursPrevention.archivedAt), isNull(parcoursPrevention.completedAt)))) as RawRow[];

  // Dernière erreur de sync par parcours actif.
  const errorEntries = await db
    .select({
      parcoursId: syncRunEntries.parcoursId,
      error: syncRunEntries.error,
    })
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

  const errorByParcours = new Map<string, string>();
  for (const e of errorEntries) {
    if (e.error && !errorByParcours.has(e.parcoursId)) errorByParcours.set(e.parcoursId, e.error);
  }

  const counts = Object.fromEntries(DIAGNOSTIC_STATE_ORDER.map((s) => [s, 0])) as Record<DiagnosticState, number>;

  const result: DiagnosticRow[] = rows.map((r) => {
    const syncError = errorByParcours.get(r.parcoursId);
    const state = classify(r, syncError);
    counts[state] += 1;

    const detail =
      state === DiagnosticState.SYNC_ERREUR || state === DiagnosticState.SYNC_ERREUR_DEPOSE
        ? (syncError ?? null)
        : state === DiagnosticState.ORPHELIN
          ? "Aucun dossier d'éligibilité accepté rattaché"
          : null;

    return {
      state,
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
      ageDays: ageDays(referenceDate(state, r)),
      detail,
    };
  });

  // Tri : anomalies d'abord (ordre des états), puis par âge décroissant.
  const stateRank = new Map(DIAGNOSTIC_STATE_ORDER.map((s, i) => [s, i]));
  result.sort((a, b) => {
    const ra = stateRank.get(a.state) ?? 99;
    const rb = stateRank.get(b.state) ?? 99;
    if (ra !== rb) return ra - rb;
    return (b.ageDays ?? 0) - (a.ageDays ?? 0);
  });

  return { rows: result, counts, total: result.length, generatedAt: new Date().toISOString() };
}
