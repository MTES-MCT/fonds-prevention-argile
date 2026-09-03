/**
 * Rejoue dans `parcours_actions` les évènements passés qui n'étaient pas encore tracés :
 * réponses des Aller-vers (`prospect_qualifications`) et archivages
 * (`parcours_prevention.archived_at`).
 *
 * Contexte
 * --------
 * Ces deux évènements ne créaient aucune action jusqu'à leur ajout applicatif. Les
 * surfaces de suivi (historique du dossier, délai moyen de première réponse de
 * `/administration/activite`) ne les voyaient donc pas. Les tables sources gardent la
 * DATE d'origine : ce script la réutilise (`occurredAt`), il ne date pas les actions
 * du jour du rattrapage.
 *
 * Ce qui n'est PAS rattrapable : un dé-archivage passé (le dé-archivage efface
 * `archived_at`, aucune trace ne subsiste) et un archivage sans `archived_by`
 * (pas d'auteur → pas de snapshot possible). Ces cas sont comptés, pas inventés.
 *
 * Idempotent : on n'écrit pas si une action du même type existe déjà à la même date sur
 * le parcours. Pour l'archivage, on saute aussi les parcours dont une action existe déjà
 * autour de `archived_at` (la décision qui a archivé — qualification non éligible, refus
 * d'accompagnement, correction de simulation — porte déjà l'information).
 *
 * Niveaux d'engagement
 *   (rien)     dry-run : inventaire, aucune écriture
 *   --apply    écrit les actions manquantes
 *
 * Ciblage
 *   (aucun)                tous les parcours
 *   --parcours-id=<uuid>   un parcours précis
 *
 * Usage
 *   pnpm fix:backfill-actions-audit
 *   pnpm fix:backfill-actions-audit --apply
 *   pnpm fix:backfill-actions-audit --parcours-id=<uuid> --apply
 *
 * Pré-requis : .env.local (ou vars Scalingo) avec la config DB.
 */

import "../lib/env";
import { and, eq, isNotNull, gte, lte } from "drizzle-orm";
import { db, rawClient } from "@/shared/database/client";
import { parcoursPrevention, parcoursActions, prospectQualifications } from "@/shared/database/schema";
import { logSystemAction } from "@/features/backoffice/espace-agent/shared/services/action-audit.service";
import { ACTION_TYPE_DOSSIER_ARCHIVE } from "@/features/backoffice/espace-agent/shared/domain/types/action.types";
import {
  ACTION_TYPE_BY_DECISION,
  buildQualificationAuditMessage,
} from "@/features/backoffice/espace-agent/prospects/domain/qualification-audit";
import type { QualificationDecision } from "@/features/backoffice/espace-agent/prospects/domain/types";
import { getArg, hasFlag } from "../lib/args";

const APPLY = hasFlag("apply");
const PARCOURS_ID = getArg("parcours-id");

/** Fenêtre autour de `archived_at` en deçà de laquelle une action existante vaut déjà trace. */
const FENETRE_ARCHIVAGE_MS = 2 * 60 * 1000;

interface Planned {
  parcoursId: string;
  actionType: string;
  message: string | null;
  occurredAt: Date;
  agentId: string;
  source: "qualification" | "archivage";
}

function line() {
  console.log("=".repeat(72));
}

/** Une action de ce type existe-t-elle déjà à cette date exacte ? */
async function actionDejaTracee(parcoursId: string, actionType: string, occurredAt: Date): Promise<boolean> {
  const rows = await db
    .select({ id: parcoursActions.id })
    .from(parcoursActions)
    .where(
      and(
        eq(parcoursActions.parcoursId, parcoursId),
        eq(parcoursActions.actionType, actionType),
        eq(parcoursActions.createdAt, occurredAt)
      )
    )
    .limit(1);
  return rows.length > 0;
}

/** Une action — quel que soit son type — encadre-t-elle déjà cet archivage ? */
async function archivageDejaExplique(parcoursId: string, archivedAt: Date): Promise<boolean> {
  const rows = await db
    .select({ id: parcoursActions.id })
    .from(parcoursActions)
    .where(
      and(
        eq(parcoursActions.parcoursId, parcoursId),
        gte(parcoursActions.createdAt, new Date(archivedAt.getTime() - FENETRE_ARCHIVAGE_MS)),
        lte(parcoursActions.createdAt, new Date(archivedAt.getTime() + FENETRE_ARCHIVAGE_MS))
      )
    )
    .limit(1);
  return rows.length > 0;
}

/** Qualifications Aller-vers sans action correspondante. */
async function collectQualifications(): Promise<Planned[]> {
  const rows = await db
    .select()
    .from(prospectQualifications)
    .where(PARCOURS_ID ? eq(prospectQualifications.parcoursId, PARCOURS_ID) : undefined)
    .orderBy(prospectQualifications.createdAt);

  const planned: Planned[] = [];
  for (const row of rows) {
    const decision = row.decision as QualificationDecision;
    const actionType = ACTION_TYPE_BY_DECISION[decision];
    if (!actionType) continue;
    if (await actionDejaTracee(row.parcoursId, actionType, row.createdAt)) continue;

    planned.push({
      parcoursId: row.parcoursId,
      actionType,
      message: buildQualificationAuditMessage({
        decision,
        raisonsIneligibilite: row.raisonsIneligibilite,
        estMandataireFinancier: row.estMandataireFinancier,
        note: row.note,
      }),
      occurredAt: row.createdAt,
      agentId: row.agentId,
      source: "qualification",
    });
  }
  return planned;
}

/** Archivages encore en cours (archived_at non nul) sans action autour de cette date. */
async function collectArchivages(): Promise<{ planned: Planned[]; sansAuteur: number }> {
  const conditions = [isNotNull(parcoursPrevention.archivedAt)];
  if (PARCOURS_ID) conditions.push(eq(parcoursPrevention.id, PARCOURS_ID));

  const rows = await db
    .select({
      id: parcoursPrevention.id,
      archivedAt: parcoursPrevention.archivedAt,
      archivedBy: parcoursPrevention.archivedBy,
      archiveReason: parcoursPrevention.archiveReason,
    })
    .from(parcoursPrevention)
    .where(and(...conditions));

  const planned: Planned[] = [];
  let sansAuteur = 0;

  for (const row of rows) {
    if (!row.archivedAt) continue;
    if (!row.archivedBy) {
      sansAuteur++;
      continue;
    }
    if (await archivageDejaExplique(row.id, row.archivedAt)) continue;

    planned.push({
      parcoursId: row.id,
      actionType: ACTION_TYPE_DOSSIER_ARCHIVE,
      message: row.archiveReason,
      occurredAt: row.archivedAt,
      agentId: row.archivedBy,
      source: "archivage",
    });
  }

  return { planned, sansAuteur };
}

async function main() {
  line();
  console.log(
    `BACKFILL ACTIONS D'AUDIT — ${APPLY ? "APPLY" : "DRY-RUN"}${PARCOURS_ID ? ` — parcours ${PARCOURS_ID}` : " — tous les parcours"}`
  );
  line();

  const qualifications = await collectQualifications();
  const { planned: archivages, sansAuteur } = await collectArchivages();
  const planned = [...qualifications, ...archivages].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

  console.log(`Réponses Aller-vers à rattraper : ${qualifications.length}`);
  console.log(`Archivages à rattraper          : ${archivages.length}`);
  if (sansAuteur > 0) {
    console.log(`Archivages ignorés (sans auteur en base, snapshot impossible) : ${sansAuteur}`);
  }
  console.log();

  for (const p of planned) {
    console.log(
      `  ${p.occurredAt.toISOString()}  ${p.actionType.padEnd(30)} ${p.parcoursId}  ${p.message ?? "<sans message>"}`
    );
  }
  console.log();

  if (planned.length === 0) {
    console.log("Rien à faire.");
    await rawClient.end();
    return;
  }

  if (!APPLY) {
    console.log("Mode dry-run — aucune écriture. Commande pour appliquer :");
    console.log(`  pnpm fix:backfill-actions-audit${PARCOURS_ID ? ` --parcours-id=${PARCOURS_ID}` : ""} --apply`);
    await rawClient.end();
    return;
  }

  console.log("APPLICATION :");
  let ok = 0;
  let ko = 0;
  for (const p of planned) {
    const written = await logSystemAction({
      parcoursId: p.parcoursId,
      author: { agentId: p.agentId },
      actionType: p.actionType,
      message: p.message,
      occurredAt: p.occurredAt,
    });
    if (written) {
      ok++;
    } else {
      ko++;
      // Cause détaillée déjà loggée par `logSystemAction` juste au-dessus.
      console.error(`  KO   ${p.parcoursId}  ${p.actionType}  (agent ${p.agentId}) — relançable`);
    }
  }

  console.log();
  console.log(`Terminé : ${ok} actions écrites, ${ko} en échec.`);
  await rawClient.end();
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  rawClient.end();
  process.exit(1);
});
