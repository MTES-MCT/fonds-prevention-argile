import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../client";
import {
  dsReconciliationObservations,
  parcoursPrevention,
  users,
  type DsReconciliationObservation,
  type ResolutionObservation,
} from "../schema";
import type { Step } from "@/shared/domain/value-objects/step.enum";

interface ObservationAEnregistrer {
  dsNumber: string;
  parcoursId: string | null;
  step: Step;
  verdict: string;
  dsState: string | null;
  detail: string | null;
}

/** Une observation enrichie du demandeur concerné, pour l'affichage back-office. */
export interface ObservationAvecDemandeur extends DsReconciliationObservation {
  demandeurNom: string | null;
  demandeurPrenom: string | null;
}

export const dsReconciliationObservationsRepository = {
  /**
   * Enregistre ce que le balayage a constaté. Une observation par dossier DN : un nouveau
   * passage réécrit le verdict et la date, sans toucher à la résolution déjà posée par un
   * humain — sauf si le verdict change, auquel cas le cas est rouvert.
   */
  async upsertMany(observations: ObservationAEnregistrer[]): Promise<void> {
    if (observations.length === 0) return;

    for (const o of observations) {
      await db
        .insert(dsReconciliationObservations)
        .values({
          dsNumber: o.dsNumber,
          parcoursId: o.parcoursId,
          step: o.step,
          verdict: o.verdict,
          dsState: o.dsState,
          detail: o.detail,
        })
        .onConflictDoUpdate({
          target: dsReconciliationObservations.dsNumber,
          set: {
            parcoursId: o.parcoursId,
            step: o.step,
            verdict: o.verdict,
            dsState: o.dsState,
            detail: o.detail,
            observedAt: new Date(),
            // Le verdict a changé depuis la résolution : le cas redevient ouvert.
            resolvedAt: sql`CASE WHEN ${dsReconciliationObservations.verdict} = ${o.verdict} THEN ${dsReconciliationObservations.resolvedAt} ELSE NULL END`,
          },
        });
    }
  },

  /** Observations encore ouvertes pour les verdicts demandés, du plus ancien au plus récent. */
  async listerOuvertes(verdicts: string[]): Promise<ObservationAvecDemandeur[]> {
    if (verdicts.length === 0) return [];

    const rows = await db
      .select({
        observation: dsReconciliationObservations,
        nom: users.nom,
        prenom: users.prenom,
      })
      .from(dsReconciliationObservations)
      .leftJoin(parcoursPrevention, eq(parcoursPrevention.id, dsReconciliationObservations.parcoursId))
      .leftJoin(users, eq(users.id, parcoursPrevention.userId))
      .where(
        and(inArray(dsReconciliationObservations.verdict, verdicts), isNull(dsReconciliationObservations.resolvedAt))
      )
      .orderBy(desc(dsReconciliationObservations.observedAt));

    return rows.map((r) => ({ ...r.observation, demandeurNom: r.nom, demandeurPrenom: r.prenom }));
  },

  /** Compte les observations ouvertes par verdict, pour les badges d'onglets. */
  async compterOuvertesParVerdict(): Promise<Record<string, number>> {
    const rows = await db
      .select({ verdict: dsReconciliationObservations.verdict, total: sql<number>`count(*)::int` })
      .from(dsReconciliationObservations)
      .where(isNull(dsReconciliationObservations.resolvedAt))
      .groupBy(dsReconciliationObservations.verdict);

    return Object.fromEntries(rows.map((r) => [r.verdict, r.total]));
  },

  /** Referme un cas : rattaché, arbitré ou écarté. */
  async resoudre(dsNumber: string, resolution: ResolutionObservation, agentId: string | null): Promise<void> {
    await db
      .update(dsReconciliationObservations)
      .set({ resolvedAt: new Date(), resolvedBy: agentId, resolution })
      .where(eq(dsReconciliationObservations.dsNumber, dsNumber));
  },
};
