/**
 * Purge les comptes demandeurs de TEST FranceConnect (et tout leur historique) présents
 * dans le CSV des citoyens mockés du fournisseur d'identité FC « low ».
 *
 * Contexte
 * --------
 * En integration/low (staging + local), la connexion « FranceConnect » passe par un IdP
 * mocké dont les citoyens de test sont listés dans :
 *   https://github.com/france-connect/sources/blob/main/docker/volumes/fcp-low/mocks/idp/databases/citizen/base.csv
 * Ces comptes polluent la base de staging (parcours, dossiers DS, validations AMO…). Ce
 * script les identifie par leur email FC (seul champ de correspondance : le CSV n'expose
 * pas de `sub`/`fcId`) et les supprime.
 *
 * La suppression s'appuie sur les cascades DB : effacer une ligne `users` cascade vers
 * `parcours_prevention` puis `dossiers_demarches_simplifiees`, `parcours_amo_validations`
 * (→ `amo_validation_tokens`), `parcours_actions`, `prospect_qualifications` et
 * `sync_run_entries`. Les tables `agents`, `entreprises_amo` et `sync_runs` ne sont pas
 * touchées (aucune FK depuis `users`).
 *
 * Garde-fou : REFUS catégorique en production (`NEXT_PUBLIC_APP_ENV === "production"`).
 * Les mocks FC n'existent qu'en staging/local ; la prod utilise le vrai FranceConnect.
 *
 * Niveaux d'engagement
 *   (rien)     dry-run : liste les comptes qui seraient supprimés + cascade, aucune écriture
 *   --apply    supprime réellement (transaction)
 *
 * Options
 *   --email=<x>        ne traite que ce compte (doit être dans le CSV), sinon abandon
 *   --url=<u>          override de l'URL du CSV (défaut : raw GitHub main)
 *   --no-anonymize     affiche emails/noms en clair (défaut : anonymisé via lib/anonymize)
 *
 * Usage
 *   pnpm fix:purge-comptes-test-fc                 # dry-run
 *   pnpm fix:purge-comptes-test-fc --apply         # supprime
 *   pnpm fix:purge-comptes-test-fc --email=test@yopmail.com --apply
 *
 * Pré-requis : .env.local (ou vars Scalingo) avec la config DB + NEXT_PUBLIC_APP_ENV.
 */

import "../lib/env";
import { inArray } from "drizzle-orm";
import { db, rawClient } from "@/shared/database/client";
import {
  users,
  parcoursPrevention,
  dossiersDemarchesSimplifiees,
  parcoursAmoValidations,
} from "@/shared/database/schema";
import { isProduction } from "@/shared/config/env.config";
import { createRedactor } from "../lib/anonymize";
import { getArg, hasFlag } from "../lib/args";
import { parseTestEmails } from "../lib/fc-test-emails";

const CSV_URL_DEFAULT =
  "https://raw.githubusercontent.com/france-connect/sources/main/docker/volumes/fcp-low/mocks/idp/databases/citizen/base.csv";

const APPLY = hasFlag("apply");
const ANONYMIZE = !hasFlag("no-anonymize");
const EMAIL_FILTER = getArg("email")?.trim().toLowerCase();
const CSV_URL = getArg("url") ?? CSV_URL_DEFAULT;

const { redactEmail, redactName, redactUuid } = createRedactor(ANONYMIZE);

function line() {
  console.log("=".repeat(72));
}

async function main() {
  line();
  console.log(`PURGE COMPTES TEST FRANCECONNECT — ${APPLY ? "APPLY" : "DRY-RUN"}`);
  line();

  // --- 1. Garde-fou anti-prod (aucun override possible) ---
  if (isProduction()) {
    console.error("ABANDON : NEXT_PUBLIC_APP_ENV=production. Ce script est réservé à staging/local.");
    await rawClient.end();
    process.exit(1);
  }

  // --- 2. Récupération du CSV (live) ---
  console.log(`CSV source : ${CSV_URL}`);
  const res = await fetch(CSV_URL);
  if (!res.ok) {
    console.error(`ABANDON : échec du téléchargement du CSV (HTTP ${res.status}).`);
    await rawClient.end();
    process.exit(1);
  }
  let testEmails = parseTestEmails(await res.text());
  console.log(`Emails de test dans le CSV : ${testEmails.length}`);

  if (EMAIL_FILTER) {
    if (!testEmails.includes(EMAIL_FILTER)) {
      console.error(`ABANDON : --email=${EMAIL_FILTER} n'est pas un compte de test du CSV.`);
      await rawClient.end();
      process.exit(1);
    }
    testEmails = [EMAIL_FILTER];
    console.log(`Filtre --email : ${redactEmail(EMAIL_FILTER)}`);
  }
  console.log();

  // --- 3. Comptes présents en base ---
  const matched = await db.select().from(users).where(inArray(users.email, testEmails));

  if (matched.length === 0) {
    console.log("Aucun compte de test trouvé en base. Rien à supprimer.");
    await rawClient.end();
    return;
  }

  // Comptage de la cascade (pour un dry-run lisible).
  const userIds = matched.map((u) => u.id);
  const parcours = await db
    .select({ id: parcoursPrevention.id, userId: parcoursPrevention.userId })
    .from(parcoursPrevention)
    .where(inArray(parcoursPrevention.userId, userIds));
  const parcoursIds = parcours.map((p) => p.id);
  const dossiers = parcoursIds.length
    ? await db
        .select({ id: dossiersDemarchesSimplifiees.id })
        .from(dossiersDemarchesSimplifiees)
        .where(inArray(dossiersDemarchesSimplifiees.parcoursId, parcoursIds))
    : [];
  const validations = parcoursIds.length
    ? await db
        .select({ id: parcoursAmoValidations.id })
        .from(parcoursAmoValidations)
        .where(inArray(parcoursAmoValidations.parcoursId, parcoursIds))
    : [];

  const parcoursByUser = new Map<string, number>();
  for (const p of parcours) parcoursByUser.set(p.userId, (parcoursByUser.get(p.userId) ?? 0) + 1);

  console.log(`Comptes de test en base : ${matched.length}`);
  for (const u of matched) {
    console.log(
      `  ${redactUuid(u.id)}  ${redactName(u.nom, u.prenom)}  ${redactEmail(u.email)}  ` +
        `parcours=${parcoursByUser.get(u.id) ?? 0}`
    );
  }
  console.log();
  console.log("Cascade totale qui sera supprimée :");
  console.log(`  users                          : ${matched.length}`);
  console.log(`  parcours_prevention            : ${parcours.length}`);
  console.log(`  dossiers_demarches_simplifiees : ${dossiers.length}`);
  console.log(`  parcours_amo_validations       : ${validations.length}`);
  console.log(`  (+ parcours_actions, prospect_qualifications, sync_run_entries, amo_validation_tokens)`);
  console.log();

  // Info : emails du CSV sans compte en base.
  const foundEmails = new Set(matched.map((u) => u.email?.toLowerCase()).filter(Boolean));
  const absents = testEmails.filter((e) => !foundEmails.has(e));
  console.log(`Emails de test sans compte en base (ignorés) : ${absents.length}`);
  console.log();

  if (!APPLY) {
    console.log("Mode dry-run — aucune écriture. Commande pour appliquer :");
    console.log(`  pnpm fix:purge-comptes-test-fc${EMAIL_FILTER ? ` --email=${EMAIL_FILTER}` : ""} --apply`);
    await rawClient.end();
    return;
  }

  // --- 4. Suppression (transaction, cascade DB) ---
  const deleted = await db.transaction(async (tx) => {
    const rows = await tx.delete(users).where(inArray(users.id, userIds)).returning({ id: users.id });
    return rows.length;
  });

  // --- 5. Vérification ---
  const restants = await db.select({ id: users.id }).from(users).where(inArray(users.id, userIds));

  line();
  console.log("ÉTAT FINAL :");
  console.log(`  users supprimés   : ${deleted}   (attendu ${matched.length})`);
  console.log(`  users restants    : ${restants.length}   (attendu 0)`);
  line();

  await rawClient.end();
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  rawClient.end();
  process.exit(1);
});
