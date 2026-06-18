/**
 * Nettoyage des "faux dépôts" : submitted_at renseigné sur des dossiers jamais synchronisés.
 *
 * Contexte (cf docs/parcours/SYNC-ERREURS-ET-REMEDIATION.md) :
 * Avant la PR #216, `createDossierForCurrentStep` posait à la CRÉATION
 * `ds_status = EN_CONSTRUCTION` ET `submitted_at = now()` → tout dossier prérempli était
 * marqué "déposé" alors qu'il n'était que créé. La migration 0034 de #216 a repassé
 * `ds_status` à NULL pour les dossiers jamais synchronisés (`last_sync_at IS NULL`) mais
 * a LAISSÉ `submitted_at`. Résultat : des `submitted_at` trompeurs (= date de création,
 * pas un vrai dépôt) qui faussent le diagnostic et les stats.
 *
 * Invariant : avec le code actuel, `submitted_at` n'est écrit QUE par une sync réussie,
 * qui pose AUSSI `last_sync_at`. Donc `submitted_at` renseigné + `last_sync_at` NULL est
 * forcément un faux dépôt legacy → on le repasse à NULL. Aucun vrai dépôt n'est touché.
 *
 * LECTURE/ÉCRITURE ciblée : `UPDATE ... SET submitted_at = NULL
 *   WHERE last_sync_at IS NULL AND submitted_at IS NOT NULL` (toutes étapes).
 *
 * Usage :
 *   pnpm fix:clean-faux-depots           # dry-run (compte + ventilation, aucune écriture)
 *   pnpm fix:clean-faux-depots --apply   # applique le nettoyage
 *
 * Prérequis : .env.local avec DATABASE_URL.
 */

import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { createOpsDb } from "../lib/db";
import { dossiersDemarchesSimplifiees } from "@/shared/database/schema";
import { hasFlag } from "../lib/args";

const APPLY = hasFlag("apply");
const { db, client } = createOpsDb();

async function main() {
  console.log("=".repeat(72));
  console.log(`CLEAN FAUX DÉPÔTS (submitted_at legacy) — ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log("=".repeat(72));
  console.log("Cible : submitted_at renseigné AVEC last_sync_at NULL (faux dépôt à la création).");
  console.log();

  // Ventilation par étape des dossiers concernés (lecture).
  const cibles = await db
    .select({
      step: dossiersDemarchesSimplifiees.step,
      count: sql<number>`count(*)::int`,
    })
    .from(dossiersDemarchesSimplifiees)
    .where(and(isNull(dossiersDemarchesSimplifiees.lastSyncAt), isNotNull(dossiersDemarchesSimplifiees.submittedAt)))
    .groupBy(dossiersDemarchesSimplifiees.step);

  const total = cibles.reduce((acc, c) => acc + c.count, 0);

  console.log(`Faux dépôts détectés : ${total}`);
  for (const c of cibles) console.log(`  - ${c.step.padEnd(12)} : ${c.count}`);
  console.log();

  if (total === 0) {
    console.log("Rien à nettoyer.");
    await client.end();
    return;
  }

  if (!APPLY) {
    console.log(`Mode dry-run — aucune écriture. Relancer avec --apply pour repasser ${total} submitted_at à NULL.`);
    await client.end();
    return;
  }

  const updated = await db
    .update(dossiersDemarchesSimplifiees)
    .set({ submittedAt: null })
    .where(and(isNull(dossiersDemarchesSimplifiees.lastSyncAt), isNotNull(dossiersDemarchesSimplifiees.submittedAt)))
    .returning({ id: dossiersDemarchesSimplifiees.id });

  console.log("=".repeat(72));
  console.log(`Terminé : ${updated.length} submitted_at repassés à NULL.`);
  console.log("=".repeat(72));

  await client.end();
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  client.end();
  process.exit(1);
});
