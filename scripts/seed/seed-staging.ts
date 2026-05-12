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
 *   3. agents   — INSERT 7 super-admins (ON CONFLICT DO UPDATE)
 *   4. amo-av   — INSERT fixtures AMO + Allers-vers
 *   5. parcours — joue les 13 SQL de sql/fake-parcours/00 → 13
 *   6. verify   — joue 99-verification.sql
 *
 * Usage :
 *   pnpm seed:staging
 *   pnpm seed:staging --steps=agents,amo-av
 *   pnpm seed:staging --dry-run
 *   pnpm seed:staging --yes-staging         # requis quand APP_ENV=staging
 *
 * Doc complète : scripts/seed/README.md
 */

import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { rawClient } from "@/shared/database/client";

// Charge .env.local si DATABASE_URL pas déjà défini (cas du lancement local).
if (!process.env.DATABASE_URL && !process.env.SCALINGO_POSTGRESQL_URL) {
  config({ path: ".env.local" });
}

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
  "06-test-aucun-amo.sql",
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
  const catnat =
    await rawClient<{ count: number }[]>`SELECT count(*)::int AS count FROM catastrophes_naturelles`;

  if (!rga[0] || rga[0].count === 0) {
    throw new Error(
      "rga_zones vide. Lance d'abord : pnpm rga:import /chemin/vers/AleaRG_2025_Fxx_L93.shp"
    );
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
}

async function runAmoAvStep(dryRun: boolean): Promise<void> {
  console.log("→ amo-av");
  await runSqlFile("amo-av/seed-amo-av-fixtures.sql", dryRun);
}

async function runParcoursStep(dryRun: boolean): Promise<void> {
  console.log("→ parcours (15 fichiers)");
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

async function main(): Promise<void> {
  const args = parseArgs();
  console.log(
    `seed:staging — steps=${args.steps.join(",")}${args.dryRun ? " (dry-run)" : ""}\n`
  );

  if (args.steps.includes("safety")) assertNotProduction(args.yesStaging);
  if (args.steps.includes("ref-data") && !args.dryRun) await assertRefDataPresent();
  if (args.steps.includes("amo-av")) await runAmoAvStep(args.dryRun);
  if (args.steps.includes("parcours")) await runParcoursStep(args.dryRun);
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
