/**
 * Orchestrateur de seed staging — one-shot pour repeupler une BDD de zéro avec
 * des données de test cohérentes.
 *
 * Strictement réservé aux environnements local / docker / staging. Un garde-fou
 * triple refuse l'exécution si `NEXT_PUBLIC_APP_ENV=production` ou si l'URL DB
 * semble pointer la prod.
 *
 * Pipeline (6 étapes, ~30s en local) :
 *   1. safety   — vérifs env + DB URL
 *   2. ref-data — bail si rga_zones ou catastrophes_naturelles est vide
 *   3. agents   — fixtures d'agents + SEED_AGENTS_SUPERADMINS + SEED_AGENTS_HYBRIDES
 *   4. amo-av   — fixtures AMO + Allers-vers (alias SEED_STRUCTURES_EMAIL posés après parcours)
 *   5. parcours — joue les 13 SQL de sql/fake-parcours/00 → 13
 *   6. verify   — joue 99-verification.sql
 *
 * Usage :
 *   pnpm seed:staging
 *   pnpm seed:staging --steps=agents,amo-av
 *   pnpm seed:staging --dry-run
 *   pnpm seed:staging --yes-staging         # requis quand APP_ENV=staging
 *   pnpm seed:staging --yes-staging --purge-fc   # + supprime les comptes de test FranceConnect
 *
 * Doc complète : scripts/seed/README.md
 */

import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { rawClient } from "@/shared/database/client";
import { listerComptesTestFc, recupererEmailsTestFc, supprimerComptesTestFc } from "../ops/lib/purge-fc";

// Filet pour un lancement qui ne passe pas par le runner (lui charge déjà .env.local) :
// dotenv ne remplace jamais une variable déjà définie, l'appel est donc sans effet sinon.
config({ path: ".env.local" });

// ============================================================================
// Steps
// ============================================================================

// Ordre IMPORTANT : amo-av AVANT parcours (les fixtures fake-parcours/03
// référencent un AMO `dedd84de-…` créé par amo-av), et agents APRÈS parcours
// (parcours/13 fait DELETE+INSERT sur les AMOs `99999999*` que les agents
// référencent — un agents avant parcours verrait ses FK reset à NULL).
const ALL_STEPS = ["safety", "ref-data", "amo-av", "parcours", "agents", "verify"] as const;
type Step = (typeof ALL_STEPS)[number];

const FAKE_PARCOURS_FILES = [
  "00-init.sql",
  "01-users.sql",
  "01b-users-prospects.sql",
  "02-parcours.sql",
  "03-validations-amo.sql",
  "04-dossiers-ds.sql",
  "05-prospects-sans-amo.sql",
  // 06-test-aucun-amo.sql : volontairement exclu. C'est un scénario manuel (cf. son en-tête)
  // qui vide `departements` de TOUTES les AMO couvrant le 36, pour tester « Aucun AMO
  // disponible ». Exécuté en série, il prive les AMO seedées de territoire.
  "07-commentaires.sql",
  "08-prospect-qualifications.sql",
  "09-archives-dashboard.sql",
  "10-top-departements-dashboard.sql",
  "11-statistiques-demandes.sql",
  "12-donnees-eligibilite.sql",
  "13-amo-av-arrete-2026.sql",
];

// ============================================================================
// CLI args
// ============================================================================

interface CliArgs {
  steps: Step[];
  dryRun: boolean;
  yesStaging: boolean;
  purgeFc: boolean;
}

function parseArgs(): CliArgs {
  const argv = process.argv.slice(2);
  const stepsArg = argv.find((a) => a.startsWith("--steps="));
  const steps = stepsArg
    ? (stepsArg
        .slice("--steps=".length)
        .split(",")
        .map((s) => s.trim())
        .filter((s): s is Step => (ALL_STEPS as readonly string[]).includes(s)) as Step[])
    : [...ALL_STEPS];

  return {
    steps,
    dryRun: argv.includes("--dry-run"),
    yesStaging: argv.includes("--yes-staging"),
    purgeFc: argv.includes("--purge-fc"),
  };
}

// ============================================================================
// Safety guard (refuse production)
// ============================================================================

function maskUrl(url: string): string {
  return url.replace(/:[^:@]+@/, ":****@");
}

function assertNotProduction(yesStaging: boolean): void {
  const env = process.env.NEXT_PUBLIC_APP_ENV ?? "local";
  const dbUrl = process.env.DATABASE_URL ?? process.env.SCALINGO_POSTGRESQL_URL ?? "";

  // 1. Refus immédiat si APP_ENV=production
  if (env === "production") {
    throw new Error("REFUSED: NEXT_PUBLIC_APP_ENV=production — ce script ne tourne pas en prod.");
  }

  // 2. Heuristique URL : refus si le host contient "prod" sans "staging"
  //    (lookbehind négatif pour éviter les faux positifs sur staging-prod-… etc.)
  if (/(?<!staging[-_])prod(?:uction)?(?![a-z])/i.test(dbUrl)) {
    throw new Error(
      `REFUSED: DATABASE_URL semble pointer prod (${maskUrl(dbUrl)}). ` +
        `Si c'est un faux positif (host légitimement nommé), renomme la variable temporairement.`
    );
  }

  // 3. En staging, exige --yes-staging explicite (anti slip-of-fingers)
  if (env === "staging" && !yesStaging) {
    throw new Error("REFUSED: --yes-staging requis quand NEXT_PUBLIC_APP_ENV=staging.");
  }

  // local / docker / staging-avec-flag : OK
  console.log(`✓ safety OK (NEXT_PUBLIC_APP_ENV=${env})`);
}

// ============================================================================
// Ref data presence (bail si vide)
// ============================================================================

async function assertRefDataPresent(): Promise<void> {
  const rga = await rawClient<{ count: number }[]>`SELECT count(*)::int AS count FROM rga_zones`;
  const catnat = await rawClient<{ count: number }[]>`SELECT count(*)::int AS count FROM catastrophes_naturelles`;

  if (!rga[0] || rga[0].count === 0) {
    throw new Error("rga_zones vide. Lance d'abord : pnpm rga:import /chemin/vers/AleaRG_2025_Fxx_L93.shp");
  }
  if (!catnat[0] || catnat[0].count === 0) {
    throw new Error("catastrophes_naturelles vide. Lance d'abord : pnpm seo:import-catnat");
  }

  console.log(`✓ ref-data présent (rga_zones=${rga[0].count}, catnat=${catnat[0].count})`);
}

// ============================================================================
// SQL runner
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SQL_ROOT = join(__dirname, "sql");

async function runSqlFile(relPath: string, dryRun: boolean): Promise<void> {
  const fullPath = join(SQL_ROOT, relPath);
  if (dryRun) {
    console.log(`  [dry-run] ${relPath}`);
    return;
  }
  const sqlText = readFileSync(fullPath, "utf-8");
  // Atomicité par fichier : `begin()` ouvre une transaction sur une connexion
  // dédiée du pool (postgres-js refuse `BEGIN;...COMMIT;` via `.unsafe()` parce
  // que le pool peut router les statements sur des connexions différentes).
  // `.simple()` active le simple query protocol qui supporte le multi-statement.
  await rawClient.begin(async (tx) => {
    await tx.unsafe(sqlText).simple();
  });
  console.log(`  ✓ ${relPath}`);
}

// ============================================================================
// Steps execution
// ============================================================================

async function runAgentsStep(dryRun: boolean): Promise<void> {
  console.log("→ agents");
  await runSqlFile("agents/seed-agents-local-staging.sql", dryRun);
  await seedSuperAdmins(dryRun);
  await seedAgentsHybrides(dryRun);
}

function lireEmails(variable: string): string[] {
  return [
    ...new Set(
      (process.env[variable] ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.includes("@"))
    ),
  ];
}

// Les super-admins sont des personnes réelles : leurs adresses arrivent par
// l'environnement, jamais par un fichier commité.
async function seedSuperAdmins(dryRun: boolean): Promise<void> {
  const emails = lireEmails("SEED_AGENTS_SUPERADMINS");

  if (emails.length === 0) {
    console.log("  · SEED_AGENTS_SUPERADMINS absent : aucun super-admin nominatif inséré");
    return;
  }
  if (dryRun) {
    console.log(`  [dry-run] ${emails.length} super-admin(s) depuis SEED_AGENTS_SUPERADMINS`);
    return;
  }

  for (const email of emails) {
    // Le vrai `sub` et l'état civil viennent de ProConnect ; la désactivation est levée comme
    // pour les fixtures SQL, sinon le compte reste refusé sans message après re-seed.
    await rawClient`
      INSERT INTO agents (sub, email, given_name, usual_name, role)
      VALUES (${`seed_${email}`}, ${email}, 'Super', 'Administrateur', 'super_administrateur'::agent_role)
      ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role,
        desactive_at = NULL, desactive_par = NULL, desactive_raison = NULL
    `;
  }
  console.log(`  ✓ ${emails.length} super-admin(s) depuis SEED_AGENTS_SUPERADMINS`);
}

// Mêmes structures que la fixture `agent-hybride-1` : AMO Maison Tranquille + Aller-vers Adil 36.
const HYBRIDE_ENTREPRISE_AMO_ID = "5833143c-9397-4a80-a7fc-3c5eb37c7a28";
const HYBRIDE_ALLERS_VERS_ID = "17628a5e-6a45-4a3c-a72c-606332b42e4c";

// L'étape amo-av remet leurs deux liens à NULL (ON DELETE SET NULL) : sans ce rattachement,
// un testeur réel du rôle cumulé devient « compte inexploitable » à chaque re-seed.
async function seedAgentsHybrides(dryRun: boolean): Promise<void> {
  const emails = lireEmails("SEED_AGENTS_HYBRIDES");

  if (emails.length === 0) {
    console.log("  · SEED_AGENTS_HYBRIDES absent : aucun testeur AMO + Aller-vers nominatif rattaché");
    return;
  }
  if (dryRun) {
    console.log(`  [dry-run] ${emails.length} testeur(s) AMO + Aller-vers depuis SEED_AGENTS_HYBRIDES`);
    return;
  }

  for (const email of emails) {
    await rawClient`
      INSERT INTO agents (sub, email, given_name, usual_name, role, entreprise_amo_id, allers_vers_id)
      VALUES (${`seed_${email}`}, ${email}, 'Testeur', 'AMO + Aller-vers', 'amo_et_allers_vers'::agent_role,
        ${HYBRIDE_ENTREPRISE_AMO_ID}::uuid, ${HYBRIDE_ALLERS_VERS_ID}::uuid)
      ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role,
        entreprise_amo_id = EXCLUDED.entreprise_amo_id, allers_vers_id = EXCLUDED.allers_vers_id,
        desactive_at = NULL, desactive_par = NULL, desactive_raison = NULL
    `;
  }
  console.log(`  ✓ ${emails.length} testeur(s) AMO + Aller-vers depuis SEED_AGENTS_HYBRIDES`);
}

// Le slug de la fixture devient le sous-adressage : `alohe@example.org` et la base
// `prenom.nom@beta.gouv.fr` donnent `prenom.nom+alohe@beta.gouv.fr`. Une adresse par
// structure, donc filtrable à la réception, sans aucune en clair dans le dépôt.
function construireAlias(base: string, emailFixture: string): string {
  const [local, domaine] = base.split("@");
  const slug = emailFixture.split("@")[0];
  return `${local}+${slug}@${domaine}`;
}

// Les fixtures portent des adresses `@example.org`, non délivrables : sans surcharge,
// une session de test ne reçoit jamais l'invitation envoyée à l'AMO du territoire.
async function redirigerEmailsStructures(dryRun: boolean): Promise<void> {
  const base = (process.env.SEED_STRUCTURES_EMAIL ?? "").trim().toLowerCase();

  if (!base.includes("@")) {
    console.log("  · SEED_STRUCTURES_EMAIL absent : les structures gardent leurs adresses @example.org");
    return;
  }
  if (dryRun) {
    console.log(`  [dry-run] emails des structures en alias de ${base}`);
    return;
  }

  // Seules les adresses de fixture sont converties : rejouer ne double pas l'alias, et une
  // structure créée à la main pendant un test garde son adresse.
  const convertir = (email: string): string => (email.endsWith("@example.org") ? construireAlias(base, email) : email);
  let converties = 0;

  // `entreprises_amo.emails` est un TEXT séparé par `;`, `allers_vers.emails` un text[].
  const amos = await rawClient<{ id: string; emails: string }[]>`SELECT id, emails FROM entreprises_amo`;
  for (const amo of amos) {
    const alias = amo.emails
      .split(";")
      .map((e) => convertir(e.trim()))
      .join(";");
    if (alias === amo.emails) continue;
    await rawClient`UPDATE entreprises_amo SET emails = ${alias} WHERE id = ${amo.id}::uuid`;
    converties++;
  }

  const av = await rawClient<{ id: string; emails: string[] }[]>`SELECT id, emails FROM allers_vers`;
  for (const structure of av) {
    const alias = structure.emails.map(convertir);
    if (alias.every((e, i) => e === structure.emails[i])) continue;
    await rawClient`UPDATE allers_vers SET emails = ${alias}::text[] WHERE id = ${structure.id}::uuid`;
    converties++;
  }

  console.log(`  ✓ ${converties} structure(s) passée(s) en alias de ${base}`);
}

async function runAmoAvStep(dryRun: boolean): Promise<void> {
  console.log("→ amo-av");
  await runSqlFile("amo-av/seed-amo-av-fixtures.sql", dryRun);
}

async function runParcoursStep(dryRun: boolean): Promise<void> {
  console.log(`→ parcours (${FAKE_PARCOURS_FILES.length} fichiers)`);
  for (const f of FAKE_PARCOURS_FILES) {
    await runSqlFile(`fake-parcours/${f}`, dryRun);
  }
}

async function runVerifyStep(dryRun: boolean): Promise<void> {
  console.log("→ verify");
  await runSqlFile("fake-parcours/99-verification.sql", dryRun);
}

// ============================================================================
// Main
// ============================================================================

/**
 * Supprime les comptes demandeurs créés par un vrai login FranceConnect de test.
 * Le seed ne les voit pas (ses nettoyages ciblent ses propres préfixes d'uuid), et les
 * laisser en place fausse les tests : ils gardent leur simulation mais perdent leur
 * validation AMO, effacée sans filtre par l'étape `amo-av`.
 */
async function runPurgeFcStep(dryRun: boolean): Promise<void> {
  console.log("→ purge-fc");
  const emails = await recupererEmailsTestFc();
  const presents = await listerComptesTestFc(emails);

  if (presents.length === 0) {
    console.log("  ✓ aucun compte de test FranceConnect en base");
    return;
  }
  if (dryRun) {
    console.log(`  [dry-run] ${presents.length} compte(s) de test seraient supprimés (cascade)`);
    return;
  }

  const supprimes = await supprimerComptesTestFc(emails);
  console.log(`  ✓ ${supprimes} compte(s) de test supprimé(s), cascade comprise`);
}

async function main(): Promise<void> {
  const args = parseArgs();
  const modificateurs = [args.purgeFc ? "purge-fc" : null, args.dryRun ? "dry-run" : null].filter(Boolean);
  console.log(
    `seed:staging — steps=${args.steps.join(",")}${modificateurs.length ? ` (${modificateurs.join(", ")})` : ""}\n`
  );

  if (args.steps.includes("safety")) assertNotProduction(args.yesStaging);

  // La purge supprime de vrais comptes : jamais sans la garde, même si `--steps=`
  // a exclu l'étape safety. Elle passe avant tout le reste, sinon `amo-av` viderait
  // d'abord leurs validations AMO et les laisserait à moitié dépouillés.
  if (args.purgeFc) {
    if (!args.steps.includes("safety")) assertNotProduction(args.yesStaging);
    await runPurgeFcStep(args.dryRun);
  }

  if (args.steps.includes("ref-data") && !args.dryRun) await assertRefDataPresent();
  if (args.steps.includes("amo-av")) await runAmoAvStep(args.dryRun);
  if (args.steps.includes("parcours")) await runParcoursStep(args.dryRun);
  // Après parcours : 07 et 13 suppriment puis réinsèrent les structures « seed test ».
  if (args.steps.includes("amo-av") || args.steps.includes("parcours")) {
    await redirigerEmailsStructures(args.dryRun);
  }
  if (args.steps.includes("agents")) await runAgentsStep(args.dryRun);
  if (args.steps.includes("verify")) await runVerifyStep(args.dryRun);

  console.log("\n✓ seed:staging done");
}

main()
  .then(async () => {
    await rawClient.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("\n✗ seed:staging failed:", err.message);
    await rawClient.end().catch(() => {});
    process.exit(1);
  });
