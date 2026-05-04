import { desc, eq, sql, and } from "drizzle-orm";
import { db } from "../client";
import { syncRuns, type SyncRun, type NewSyncRun } from "../schema/sync-runs";
import {
  syncRunEntries,
  type SyncRunEntry,
  type NewSyncRunEntry,
  type DsStatusChange,
} from "../schema/sync-run-entries";
import { parcoursPrevention } from "../schema/parcours-prevention";
import { users } from "../schema/users";
import {
  SyncRunStatus,
  SyncRunTrigger,
} from "@/shared/domain/value-objects/sync-run-status.enum";

export type SyncRunListItem = SyncRun;

export interface SyncRunDetailEntry extends SyncRunEntry {
  parcoursId: string;
  userId: string | null;
  userPrenom: string | null;
  userNom: string | null;
  userEmail: string | null;
}

export interface SyncRunDetail {
  run: SyncRun;
  entries: SyncRunDetailEntry[];
}

export class SyncRunRepository {
  /**
   * Crée une nouvelle ligne de run (status null = pending tant que !finished_at).
   */
  async createRun(triggeredBy: SyncRunTrigger): Promise<SyncRun> {
    const [row] = await db
      .insert(syncRuns)
      .values({
        triggeredBy,
      } as NewSyncRun)
      .returning();
    return row;
  }

  /**
   * Insère une entrée pour un parcours touché par le run.
   */
  async addEntry(entry: NewSyncRunEntry): Promise<SyncRunEntry> {
    const [row] = await db.insert(syncRunEntries).values(entry).returning();
    return row;
  }

  /**
   * Clôture un run avec ses totaux et son statut.
   */
  async finalizeRun(
    runId: string,
    data: {
      status: SyncRunStatus;
      totalParcoursScanned: number;
      totalParcoursUpdated: number;
      totalErrors: number;
      errorSummary?: string | null;
    }
  ): Promise<SyncRun | null> {
    const [row] = await db
      .update(syncRuns)
      .set({
        finishedAt: new Date(),
        status: data.status,
        totalParcoursScanned: data.totalParcoursScanned,
        totalParcoursUpdated: data.totalParcoursUpdated,
        totalErrors: data.totalErrors,
        errorSummary: data.errorSummary ?? null,
      })
      .where(eq(syncRuns.id, runId))
      .returning();

    return row ?? null;
  }

  /**
   * Liste paginée des runs (du plus récent au plus ancien).
   */
  async findRecent(params: { page?: number; pageSize?: number } = {}): Promise<{
    data: SyncRunListItem[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }> {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
    const offset = (page - 1) * pageSize;

    const data = await db
      .select()
      .from(syncRuns)
      .orderBy(desc(syncRuns.startedAt))
      .limit(pageSize)
      .offset(offset);

    const totalResult = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(syncRuns);
    const total = totalResult[0]?.count ?? 0;

    return {
      data,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  /**
   * Récupère un run avec ses entrées + infos demandeur jointes.
   */
  async findByIdWithEntries(runId: string): Promise<SyncRunDetail | null> {
    const [run] = await db.select().from(syncRuns).where(eq(syncRuns.id, runId)).limit(1);
    if (!run) return null;

    const entriesRaw = await db
      .select({
        id: syncRunEntries.id,
        syncRunId: syncRunEntries.syncRunId,
        parcoursId: syncRunEntries.parcoursId,
        stepBefore: syncRunEntries.stepBefore,
        stepAfter: syncRunEntries.stepAfter,
        statusBefore: syncRunEntries.statusBefore,
        statusAfter: syncRunEntries.statusAfter,
        dsStatusChanges: syncRunEntries.dsStatusChanges,
        stepAdvanced: syncRunEntries.stepAdvanced,
        error: syncRunEntries.error,
        createdAt: syncRunEntries.createdAt,
        userId: users.id,
        userPrenom: users.prenom,
        userNom: users.nom,
        userEmail: users.email,
      })
      .from(syncRunEntries)
      .innerJoin(parcoursPrevention, eq(syncRunEntries.parcoursId, parcoursPrevention.id))
      .innerJoin(users, eq(parcoursPrevention.userId, users.id))
      .where(eq(syncRunEntries.syncRunId, runId))
      .orderBy(desc(syncRunEntries.createdAt));

    const entries: SyncRunDetailEntry[] = entriesRaw.map((e) => ({
      ...e,
      dsStatusChanges: (e.dsStatusChanges ?? null) as DsStatusChange[] | null,
    }));

    return { run, entries };
  }

  /**
   * Récupère le dernier run terminé (utile pour exposer un état global rapide).
   */
  async findLastFinished(): Promise<SyncRun | null> {
    const [row] = await db
      .select()
      .from(syncRuns)
      .where(and(sql`${syncRuns.finishedAt} IS NOT NULL`))
      .orderBy(desc(syncRuns.finishedAt))
      .limit(1);
    return row ?? null;
  }
}

export const syncRunRepository = new SyncRunRepository();
