/**
 * Script d'import des catastrophes naturelles pour les communes du cocon SEO
 *
 * Usage:
 *   pnpm seo:import-catnat
 *
 * Variables d'environnement:
 *   DEBUG_SEO=true  - Active les logs détaillés
 *
 * Ce script:
 * 1. Lit les communes depuis le fichier JSON généré
 * 2. Récupère les catastrophes naturelles depuis l'API Georisques
 * 3. Filtre les catastrophes des 20 dernières années
 * 4. Insère les données en base de données
 */

import * as fs from "fs";
import * as path from "path";
import { catnatService, type CatnatImportStats } from "../services/catnat.service";
import type { CommuneSEO } from "../../domain/types";

// ============================================================================
// Types et configuration
// ============================================================================

interface ImportConfig {
  dryRun: boolean;
  batchSize: number;
  maxCommunes?: number;
}

interface ImportResult {
  success: boolean;
  stats: CatnatImportStats;
  duration: number;
}

// ============================================================================
// Logger
// ============================================================================

function createLogger() {
  return {
    section: (title: string) => {
      console.log(`\n${"=".repeat(80)}`);
      console.log(`  ${title}`);
      console.log(`${"=".repeat(80)}\n`);
    },
    progress: (message: string) => {
      console.log(`📊 ${message}`);
    },
    success: (message: string) => {
      console.log(`${message}`);
    },
    error: (message: string) => {
      console.error(`${message}`);
    },
    info: (message: string) => {
      console.log(`${message}`);
    },
    warning: (message: string) => {
      console.log(`${message}`);
    },
  };
}

const logger = createLogger();

// ============================================================================
// Fonctions utilitaires
// ============================================================================

/**
 * Charge les communes depuis le fichier JSON généré
 */
function loadCommunes(): CommuneSEO[] {
  const communesPath = path.join(__dirname, "../../data/generated/communes.json");

  if (!fs.existsSync(communesPath)) {
    throw new Error(
      `Fichier communes.json introuvable dans ${communesPath}.\n` + `Veuillez d'abord exécuter: pnpm seo:generate`
    );
  }

  const communesData = fs.readFileSync(communesPath, "utf-8");
  const communes: CommuneSEO[] = JSON.parse(communesData);

  return communes;
}

/**
 * Formatte une durée en secondes de manière lisible
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Formatte un nombre avec séparateurs de milliers
 */
function formatNumber(num: number): string {
  return num.toLocaleString("fr-FR");
}

/**
 * Affiche la barre de progression
 */
function displayProgressBar(current: number, total: number, stats: Partial<CatnatImportStats>) {
  const percentage = Math.round((current / total) * 100);
  const barLength = 40;
  const filledLength = Math.round((barLength * current) / total);
  const bar = "█".repeat(filledLength) + "░".repeat(barLength - filledLength);

  const successRate =
    stats.communesProcessed && stats.communesSuccess
      ? Math.round((stats.communesSuccess / stats.communesProcessed) * 100)
      : 0;

  process.stdout.write(
    `\r  ${bar} ${percentage}% | ` +
      `${current}/${total} communes | ` +
      `${formatNumber(stats.catnatImported || 0)} CATNAT importées | ` +
      `Succès: ${successRate}%`
  );
}

// ============================================================================
// Fonction principale d'import
// ============================================================================

async function importCatastrophesNaturelles(config: ImportConfig): Promise<ImportResult> {
  const startTime = Date.now();

  logger.section("IMPORT DES CATASTROPHES NATURELLES");

  // 1. Charger les communes
  logger.progress("Chargement des communes...");
  const allCommunes = loadCommunes();
  const communes = config.maxCommunes ? allCommunes.slice(0, config.maxCommunes) : allCommunes;

  logger.success(`${formatNumber(communes.length)} communes chargées`);

  if (config.dryRun) {
    logger.warning("MODE DRY-RUN : Aucune donnée ne sera importée en base");
  }

  // 2. Préparer les codes INSEE
  const codesInsee = communes.map((c) => c.codeInsee);

  // 3. Import des catastrophes naturelles
  logger.section("IMPORT EN COURS");

  let stats: CatnatImportStats;

  if (config.dryRun) {
    // Mode dry-run : simuler l'import
    logger.info("Simulation de l'import...");
    stats = {
      totalCommunes: communes.length,
      communesProcessed: communes.length,
      communesSuccess: communes.length,
      communesFailed: 0,
      totalCatnat: 0,
      catnatImported: 0,
      catnatSkipped: 0,
      errors: [],
    };
  } else {
    // Import réel
    stats = await catnatService.importForCommunes(codesInsee, (progress) => {
      displayProgressBar(progress.communesProcessed || 0, communes.length, progress);
    });

    // Afficher la dernière barre de progression complète
    displayProgressBar(stats.communesProcessed, communes.length, stats);
    console.log(); // Nouvelle ligne après la barre de progression
  }

  const duration = (Date.now() - startTime) / 1000;

  return {
    success: stats.communesFailed === 0,
    stats,
    duration,
  };
}

// ============================================================================
// Affichage des résultats
// ============================================================================

function displayResults(result: ImportResult) {
  const { stats, duration } = result;

  logger.section("RÉSULTATS DE L'IMPORT");

  // Statistiques communes
  console.log(" Communes :");
  console.log(`   • Total        : ${formatNumber(stats.totalCommunes)}`);
  console.log(`   • Traitées     : ${formatNumber(stats.communesProcessed)}`);
  console.log(`   • Succès       : ${formatNumber(stats.communesSuccess)} ✅`);
  console.log(`   • Échecs       : ${formatNumber(stats.communesFailed)} ${stats.communesFailed > 0 ? "❌" : ""}`);

  // Statistiques catastrophes
  console.log("\n  Catastrophes naturelles :");
  console.log(`   • Total trouvées  : ${formatNumber(stats.totalCatnat)}`);
  console.log(`   • Importées       : ${formatNumber(stats.catnatImported)} ✅`);
  console.log(`   • Ignorées (> 20 ans) : ${formatNumber(stats.catnatSkipped)}`);

  // Taux de succès
  const successRate =
    stats.communesProcessed > 0 ? ((stats.communesSuccess / stats.communesProcessed) * 100).toFixed(1) : "0";

  console.log(`\n Taux de succès : ${successRate}%`);
  console.log(`⏱  Durée totale  : ${formatDuration(duration)}`);

  // Afficher les erreurs s'il y en a
  if (stats.errors.length > 0) {
    logger.section("ERREURS RENCONTRÉES");

    // Grouper les erreurs par message
    const errorGroups = new Map<string, string[]>();
    for (const error of stats.errors) {
      const communes = errorGroups.get(error.error) || [];
      communes.push(error.codeInsee);
      errorGroups.set(error.error, communes);
    }

    for (const [errorMsg, communeCodes] of errorGroups.entries()) {
      logger.error(`${errorMsg} (${communeCodes.length} communes)`);
      if (communeCodes.length <= 5) {
        console.log(`   Codes INSEE : ${communeCodes.join(", ")}`);
      } else {
        console.log(`   Codes INSEE : ${communeCodes.slice(0, 5).join(", ")}... (+${communeCodes.length - 5} autres)`);
      }
    }
  }

  // Message de conclusion
  console.log();
  if (result.success) {
    logger.success("Import terminé avec succès ! 🎉");
  } else {
    logger.warning("Import terminé avec des erreurs. Consultez les logs ci-dessus.");
  }
}

// ============================================================================
// Script principal
// ============================================================================

async function main(): Promise<void> {
  try {
    // Configuration
    const config: ImportConfig = {
      dryRun: process.env.DRY_RUN === "true",
      batchSize: 10, // Limite API Georisques
      maxCommunes: process.env.MAX_COMMUNES ? parseInt(process.env.MAX_COMMUNES, 10) : undefined,
    };

    // Afficher la configuration
    logger.info("Configuration :");
    console.log(`   • Mode          : ${config.dryRun ? "DRY-RUN (simulation)" : "PRODUCTION"}`);
    console.log(`   • Taille batch  : ${config.batchSize} communes`);
    if (config.maxCommunes) {
      console.log(`   • Limite        : ${config.maxCommunes} communes`);
    }
    console.log(`   • Debug         : ${process.env.DEBUG_SEO === "true" ? "ACTIVÉ" : "DÉSACTIVÉ"}`);

    // Lancer l'import
    const result = await importCatastrophesNaturelles(config);

    // Afficher les résultats
    displayResults(result);

    // Code de sortie
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    logger.error("Erreur fatale lors de l'import :");
    console.error(error);
    process.exit(1);
  }
}

// Exécuter le script
main();
