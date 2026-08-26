import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../client";
import {
  dsReconciliationObservations,
  parcoursPrevention,
  users,
  RESOLUTION_OBSERVATION,
  type DsReconciliationObservation,
  type ResolutionObservation,
} from "../schema";
import type { Step } from "@/shared/domain/value-objects/step.enum";

/** Postgres plafonne le nombre de paramètres d'une requête : on découpe par précaution. */
const TAILLE_LOT = 500;

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

    // Un seul INSERT par lot : un balayage de démarche entière en produit plusieurs centaines.
    for (let i = 0; i < observations.length; i += TAILLE_LOT) {
      const lot = observations.slice(i, i + TAILLE_LOT);

      await db
        .insert(dsReconciliationObservations)
        .values(lot)
        .onConflictDoUpdate({
          target: dsReconciliationObservations.dsNumber,
          set: {
            parcoursId: sql`excluded.parcours_id`,
            step: sql`excluded.step`,
            verdict: sql`excluded.verdict`,
            dsState: sql`excluded.ds_state`,
            detail: sql`excluded.detail`,
            observedAt: new Date(),
            // Le verdict a changé depuis la résolution : le cas redevient ouvert.
            resolvedAt: sql`CASE WHEN ${dsReconciliationObservations.verdict} = excluded.verdict THEN ${dsReconciliationObservations.resolvedAt} ELSE NULL END`,
          },
        });
    }
  },

  /** Observations encore ouvertes pour les verdicts demandés, les plus anciennes d'abord :
   * un cas qui traîne depuis longtemps est un demandeur qui attend depuis longtemps. */
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
      .orderBy(asc(dsReconciliationObservations.observedAt));

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

  /**
   * Referme les observations dont le dossier n'a plus rien à signaler. Sans ça, un cas réglé
   * entre deux balayages resterait ouvert indéfiniment et la file ne se viderait jamais.
   */
  async refermerReglees(dsNumbers: string[]): Promise<number> {
    if (dsNumbers.length === 0) return 0;

    const fermees = await db
      .update(dsReconciliationObservations)
      .set({ resolvedAt: new Date(), resolvedBy: null, resolution: RESOLUTION_OBSERVATION.AUTO })
      .where(
        and(inArray(dsReconciliationObservations.dsNumber, dsNumbers), isNull(dsReconciliationObservations.resolvedAt))
      )
      .returning({ id: dsReconciliationObservations.id });

    return fermees.length;
  },

  /** Referme un cas : rattaché, arbitré ou écarté. */
  async resoudre(dsNumber: string, resolution: ResolutionObservation, agentId: string | null): Promise<void> {
    await db
      .update(dsReconciliationObservations)
      .set({ resolvedAt: new Date(), resolvedBy: agentId, resolution })
      .where(eq(dsReconciliationObservations.dsNumber, dsNumber));
  },
};
