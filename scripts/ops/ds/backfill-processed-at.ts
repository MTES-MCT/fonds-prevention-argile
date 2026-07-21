/**
 * Backfill de `processed_at` (date de décision DDT) depuis le champ DS `dateTraitement`.
 *
 * Contexte : `processed_at` est désormais la VRAIE date de décision, sourcée de DS, et
 * renseignée pour TOUT état final (accepté, refusé, classé sans suite). Avant ce changement
 * elle n'était posée que sur ACCEPTE, avec un `new Date()` au moment de la détection (date
 * approximative), et restait `null` sur les refus.
 *
 * La sync (CRON / « Lancer maintenant ») rattrape automatiquement les parcours ACTIFS. Ce
 * script complète le tableau là où la sync ne passe plus :
 *   - parcours COMPLÉTÉS / ARCHIVÉS (exclus de `findActiveForSync`) ;
 *   - dossiers REFUSE / CLASSE_SANS_SUITE historiques (jamais datés) ;
 *   - correction des ACCEPTE dont `processed_at` = ancienne date de détection.
 *
 * Pour chaque dossier en état final, interroge DS (lecture seule) et :
 *   FILL     processed_at local null  → écrit `dateTraitement`
 *   CORRECT  processed_at local ≠ DS  → réécrit `dateTraitement` (date DS = vérité)
 *   OK       processed_at local == DS → no-op
 *   NO_DATE  DS répond mais sans dateTraitement (dossier non traité) → ignoré
 *   GONE     DS répond « not found » (dossier purgé/supprimé) → ignoré, pas une erreur
 *   ERREUR   erreur de sondage DS (unauthorized, réseau…) → ignoré
 *
 * Dry-run par défaut. `--apply` pour écrire. `--parcours-id=<uuid>` pour cibler un parcours.
 *
 * Identifiants anonymisés par défaut (numéro DS hashé, sel aléatoire par run) — important sur
 * une copie de prod. `--no-anonymize` pour afficher les numéros en clair (debug ciblé).
 *
 * Usage :
 *   pnpm ds:backfill-processed-at                       # dry-run, anonymisé, tous les dossiers finaux
 *   pnpm ds:backfill-processed-at --apply
 *   pnpm ds:backfill-processed-at --parcours-id=<uuid> --apply
 *   pnpm ds:backfill-processed-at --no-anonymize        # numéros DS en clair
 *
 * Prérequis : .env.local avec DATABASE_URL + DEMARCHES_SIMPLIFIEES_GRAPHQL_API_* .
 */

import { and, eq, inArray } from "drizzle-orm";
// IMPORTANT : `createOpsDb` (via lib/env) charge dotenv à l'évaluation de son module.
// Il DOIT être importé AVANT `graphqlClient` (dont le singleton lit l'env DN à la construction).
import { createOpsDb } from "../lib/db";
import { graphqlClient } from "@/features/parcours/dossiers-ds/adapters/graphql/client";
import { dossiersDemarchesSimplifiees } from "@/shared/database/schema";
import { DSStatus } from "@/shared/domain/value-objects/ds-status.enum";
import { getArg, hasFlag } from "../lib/args";
import { sleep } from "../sync-erreurs/_shared";
import { createRedactor } from "../lib/anonymize";

const APPLY = hasFlag("apply");
const PARCOURS_ID = getArg("parcours-id");
const SLEEP_MS = Number(getArg("sleep") ?? "200");
const ANONYMIZE = !hasFlag("no-anonymize"); // anonymisé par défaut

const { redactDsNumber } = createRedactor(ANONYMIZE);

const ETATS_FINAUX = [DSStatus.ACCEPTE, DSStatus.REFUSE, DSStatus.CLASSE_SANS_SUITE];

type Verdict = "FILL" | "CORRECT" | "OK" | "NO_DATE" | "GONE" | "ERREUR";

async function main() {
  console.log("=".repeat(72));
  console.log(
    `BACKFILL processed_at depuis DS dateTraitement — ${APPLY ? "APPLY" : "DRY-RUN"}${ANONYMIZE ? " (anonymisé)" : ""}`
  );
  if (PARCOURS_ID) console.log(`Parcours ciblé : ${PARCOURS_ID}`);
  console.log("=".repeat(72));

  const { db, client } = createOpsDb();

  try {
    const where = PARCOURS_ID
      ? and(
          inArray(dossiersDemarchesSimplifiees.dsStatus, ETATS_FINAUX),
          eq(dossiersDemarchesSimplifiees.parcoursId, PARCOURS_ID)
        )
      : inArray(dossiersDemarchesSimplifiees.dsStatus, ETATS_FINAUX);

    const dossiers = await db
      .select({
        id: dossiersDemarchesSimplifiees.id,
        parcoursId: dossiersDemarchesSimplifiees.parcoursId,
        step: dossiersDemarchesSimplifiees.step,
        dsNumber: dossiersDemarchesSimplifiees.dsNumber,
        dsStatus: dossiersDemarchesSimplifiees.dsStatus,
        processedAt: dossiersDemarchesSimplifiees.processedAt,
      })
      .from(dossiersDemarchesSimplifiees)
      .where(where);

    console.log(`Dossiers en état final à examiner : ${dossiers.length}\n`);

    const counts = new Map<Verdict, number>();
    const bump = (v: Verdict) => counts.set(v, (counts.get(v) ?? 0) + 1);

    for (const d of dossiers) {
      const ds = redactDsNumber(d.dsNumber);

      if (!d.dsNumber) {
        bump("NO_DATE");
        continue;
      }

      let dossierDs: Awaited<ReturnType<typeof graphqlClient.getDossier>>;
      try {
        dossierDs = await graphqlClient.getDossier(Number(d.dsNumber));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // « not found » = dossier purgé/supprimé côté DS : rien à backfiller, ce n'est pas
        // une vraie erreur (unauthorized / réseau). Distingué pour ne pas alarmer sur prod.
        const gone = /not[ _]found/i.test(msg);
        console.log(`  ${ds}  ${gone ? "GONE (dossier introuvable côté DS)" : `ERREUR (${msg})`}`);
        bump(gone ? "GONE" : "ERREUR");
        if (SLEEP_MS > 0) await sleep(SLEEP_MS);
        continue;
      }

      // getDossier renvoie null quand DS répond sans erreur mais dossier introuvable → GONE.
      if (!dossierDs) {
        console.log(`  ${ds}  GONE (dossier introuvable côté DS)`);
        bump("GONE");
        if (SLEEP_MS > 0) await sleep(SLEEP_MS);
        continue;
      }

      const dateTraitement = dossierDs.dateTraitement;
      if (!dateTraitement) {
        console.log(`  ${ds}  NO_DATE (DS répond mais dossier non traité)`);
        bump("NO_DATE");
        if (SLEEP_MS > 0) await sleep(SLEEP_MS);
        continue;
      }

      const target = new Date(dateTraitement);
      const current = d.processedAt;
      const verdict: Verdict = current === null ? "FILL" : current.getTime() === target.getTime() ? "OK" : "CORRECT";

      if (verdict === "OK") {
        bump("OK");
        if (SLEEP_MS > 0) await sleep(SLEEP_MS);
        continue;
      }

      console.log(
        `  ${ds}  ${verdict}  ${d.step}/${d.dsStatus}  ` +
          `${current ? current.toISOString() : "null"} → ${target.toISOString()}`
      );

      if (APPLY) {
        await db
          .update(dossiersDemarchesSimplifiees)
          .set({ processedAt: target })
          .where(eq(dossiersDemarchesSimplifiees.id, d.id));
      }
      bump(verdict);

      if (SLEEP_MS > 0) await sleep(SLEEP_MS);
    }

    console.log();
    console.log("=".repeat(72));
    console.log("RÉCAP");
    for (const v of ["FILL", "CORRECT", "OK", "NO_DATE", "GONE", "ERREUR"] as Verdict[]) {
      console.log(`  ${v.padEnd(8)} : ${counts.get(v) ?? 0}`);
    }
    const written = (counts.get("FILL") ?? 0) + (counts.get("CORRECT") ?? 0);
    console.log(
      APPLY ? `\n${written} dossier(s) mis à jour.` : `\n${written} dossier(s) seraient mis à jour (--apply).`
    );
    console.log("=".repeat(72));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
