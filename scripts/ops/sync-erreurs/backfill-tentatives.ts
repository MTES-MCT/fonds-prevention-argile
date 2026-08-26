/**
 * Amorce le registre des tentatives (`dossiers_ds_tentatives`, cf. ADR-0027) à partir de ce
 * qu'on sait déjà : les pointeurs courants, et les numéros DN qui traînent dans les messages
 * d'erreur de synchronisation (pointeurs supprimés par l'ancien reset).
 *
 * Deux sources, deux niveaux de confiance :
 *   backfill_pointeur     ligne `dossiers_demarches_simplifiees` actuelle — fiable, complète
 *   backfill_sync_error   numéro extrait de `sync_run_entries.error` — INDICE : ni URL de
 *                         préremplissage, ni ds_id, ni date de création réelle. À ne jamais
 *                         utiliser seul pour rattacher automatiquement.
 *
 * Idempotent : `ds_number` est unique, un numéro déjà connu n'est ni dupliqué ni réécrit.
 * Le registre ne conserve que l'identité du dossier : l'URL de préremplissage porte le
 * `prefill_token` et reste sur le seul pointeur courant (ADR-0027).
 *
 * Usage :
 *   pnpm ds:backfill-tentatives           # dry-run (compte et ventile)
 *   pnpm ds:backfill-tentatives --apply   # écrit
 *
 * Prérequis : DATABASE_URL (ou vars Scalingo). N'appelle PAS l'API DN.
 */

import { isNotNull } from "drizzle-orm";
import { createOpsDb } from "../lib/db";
import {
  dossiersDemarchesSimplifiees,
  dossiersDsTentatives,
  parcoursPrevention,
  syncRunEntries,
  ORIGINE_TENTATIVE,
} from "@/shared/database/schema";
import type { Step } from "@/shared/domain/value-objects/step.enum";
import { hasFlag } from "../lib/args";
import { extraireNumerosDepuisErreur } from "./_shared";

const APPLY = hasFlag("apply");
const { db, client } = createOpsDb();

interface Tentative {
  parcoursId: string;
  step: Step;
  dsNumber: string;
  origine: string;
  dsId: string | null;
  dsDemarcheId: string | null;
}

async function main() {
  console.log("=".repeat(72));
  console.log(`BACKFILL REGISTRE DES TENTATIVES — ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log("=".repeat(72));

  const dejaConnus = new Set(
    (await db.select({ dsNumber: dossiersDsTentatives.dsNumber }).from(dossiersDsTentatives)).map((r) => r.dsNumber)
  );
  console.log(`Déjà au registre : ${dejaConnus.size}`);

  // --- Source 1 : les pointeurs courants ---
  const pointeurs = await db
    .select({
      parcoursId: dossiersDemarchesSimplifiees.parcoursId,
      step: dossiersDemarchesSimplifiees.step,
      dsNumber: dossiersDemarchesSimplifiees.dsNumber,
      dsId: dossiersDemarchesSimplifiees.dsId,
      dsDemarcheId: dossiersDemarchesSimplifiees.dsDemarcheId,
      submittedAt: dossiersDemarchesSimplifiees.submittedAt,
    })
    .from(dossiersDemarchesSimplifiees)
    .where(isNotNull(dossiersDemarchesSimplifiees.dsNumber));

  const aInserer: Tentative[] = [];
  const vus = new Set(dejaConnus);

  for (const p of pointeurs) {
    if (!p.dsNumber || vus.has(p.dsNumber)) continue;
    vus.add(p.dsNumber);
    aInserer.push({
      parcoursId: p.parcoursId,
      step: p.step as Step,
      dsNumber: p.dsNumber,
      origine: ORIGINE_TENTATIVE.BACKFILL_POINTEUR,
      dsId: p.dsId,
      dsDemarcheId: p.dsDemarcheId,
    });
  }
  const nbPointeurs = aInserer.length;

  // --- Source 2 : les numéros cités dans les erreurs de sync (pointeurs disparus) ---
  const erreurs = await db
    .select({ parcoursId: syncRunEntries.parcoursId, error: syncRunEntries.error })
    .from(syncRunEntries)
    .where(isNotNull(syncRunEntries.error));

  const parcoursExistants = new Set(
    (await db.select({ id: parcoursPrevention.id }).from(parcoursPrevention)).map((r) => r.id)
  );

  for (const e of erreurs) {
    if (!e.error || !parcoursExistants.has(e.parcoursId)) continue;
    for (const { step, dsNumber } of extraireNumerosDepuisErreur(e.error)) {
      if (vus.has(dsNumber)) continue;
      vus.add(dsNumber);
      aInserer.push({
        parcoursId: e.parcoursId,
        step,
        dsNumber,
        origine: ORIGINE_TENTATIVE.BACKFILL_SYNC_ERROR,
        dsId: null,
        dsDemarcheId: null,
      });
    }
  }
  const nbSyncErrors = aInserer.length - nbPointeurs;

  console.log();
  console.log(`À enregistrer : ${aInserer.length}`);
  console.log(`  - depuis les pointeurs courants        : ${nbPointeurs}`);
  console.log(`  - depuis les erreurs de sync (indices) : ${nbSyncErrors}`);
  console.log();

  if (aInserer.length === 0) {
    console.log("Rien à faire.");
    await client.end();
    return;
  }

  if (!APPLY) {
    console.log("Mode dry-run — aucune écriture. Relancer avec --apply.");
    await client.end();
    return;
  }

  let ok = 0;
  for (const t of aInserer) {
    const inserted = await db
      .insert(dossiersDsTentatives)
      .values(t)
      .onConflictDoNothing({ target: dossiersDsTentatives.dsNumber })
      .returning({ id: dossiersDsTentatives.id });
    if (inserted.length > 0) ok++;
  }

  console.log(`Terminé : ${ok} tentative(s) enregistrée(s), ${aInserer.length - ok} ignorée(s) (déjà connue).`);
  await client.end();
}

main().catch(async (err) => {
  console.error("Erreur fatale :", err);
  await client.end();
  process.exit(1);
});
