/**
 * Helpers partagés par les scripts de remédiation des dossiers DN en sync-erreur
 * (probe / reset / relink). Sans effet de bord à l'import : aucun `createOpsDb` ni
 * `graphqlClient` au niveau module (la DB et le client DN sont passés en paramètres),
 * pour ne pas dépendre de l'ordre de chargement de l'env.
 */

import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import type { createOpsDb } from "../lib/db";
import { parcoursPrevention, syncRunEntries } from "@/shared/database/schema";
import type { DemarchesSimplifieesClient } from "@/features/parcours/dossiers-ds/adapters/graphql/client";

export type OpsDb = ReturnType<typeof createOpsDb>["db"];
export type DnClient = DemarchesSimplifieesClient;

/** Garde-fou de pagination de la démarche (cross-check email). */
export const MAX_PAGES = 80;

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Normalise un email pour comparaison (minuscule, trim) ; null si vide. */
export const norm = (e?: string | null): string | null => e?.toLowerCase().trim() || null;

/** Normalise un message d'erreur DN en verdict de sondage. */
export function classifyDnError(message: string): "not_found" | "unauthorized" | "api_error" {
  const m = message.toLowerCase();
  if (m.includes("not found") || m.includes("not_found")) return "not_found";
  if (m.includes("unauthorized")) return "unauthorized";
  return "api_error";
}

/**
 * Map `parcoursId → dernière erreur de sync` pour les parcours actifs (réplique la
 * sous-requête du diagnostic). Présence dans la map = parcours classé sync-erreur.
 */
export async function getErrorByParcours(db: OpsDb): Promise<Map<string, string>> {
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

/** Vrai si DN ne trouve pas le dossier (pointeur mort : `null` ou erreur « not found »). */
export async function isNotFound(gql: DnClient, dsNumber: string): Promise<boolean> {
  try {
    const d = await gql.getDossier(Number(dsNumber));
    return d === null;
  } catch (err) {
    return classifyDnError(err instanceof Error ? err.message : String(err)) === "not_found";
  }
}

/**
 * Indexe les dossiers d'une démarche par email usager (une seule pagination) :
 * `email → [{ number, state, archived }]`. Sert au cross-check « existe sous un autre numéro ».
 */
export async function buildEmailIndex(
  gql: DnClient,
  demarcheNumber: number,
  sleepMs: number
): Promise<{ index: Map<string, Array<{ number: number; state: string; archived: boolean }>>; capped: boolean }> {
  const index = new Map<string, Array<{ number: number; state: string; archived: boolean }>>();
  let after: string | null = null;
  let pages = 0;
  let capped = false;

  while (pages < MAX_PAGES) {
    pages++;
    const conn = await gql.getDemarcheDossiers(demarcheNumber, { first: 100, after: after ?? undefined });
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
    if (sleepMs > 0) await sleep(sleepMs);
    if (pages >= MAX_PAGES && conn.pageInfo.hasNextPage) capped = true;
  }
  return { index, capped };
}
