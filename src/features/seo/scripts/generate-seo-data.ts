/**
 * Script de génération des données SEO pour le cocon sémantique RGA
 *
 * Usage:
 *   pnpm seo:generate
 *
 * Variables d'environnement:
 *   DEBUG_SEO=true  - Active les logs détaillés
 *
 * Ce script:
 * 1. Récupère les communes des 11 départements éligibles via l'API Géo
 * 2. Trie par population et garde les X premières par département
 * 3. Collecte les EPCI associés
 * 4. Génère les fichiers JSON dans src/features/seo/data/generated/
 */

import * as fs from "fs";
import * as path from "path";

import { DEPARTEMENTS_ELIGIBLES_RGA, COMMUNES_PAR_DEPARTEMENT, API_GEO } from "../domain/config/seo.config";
import { DEPARTEMENTS } from "../../../shared/constants/departements.constants";

/**
 * Normalise un code département pour le lookup dans DEPARTEMENTS
 * Les codes "03", "04" etc. deviennent "3", "4" pour correspondre aux clés du référentiel
 */
function normalizeCodeForLookup(code: string): string {
  // Supprimer le zéro initial si présent (sauf pour les codes spéciaux comme "2A", "2B")
  if (/^0\d$/.test(code)) {
    return code.replace(/^0/, "");
  }
  return code;
}

/**
 * Récupère le nom d'un département à partir de son code (avec ou sans zéro initial)
 */
function getDepartementNom(code: string): string {
  const normalizedCode = normalizeCodeForLookup(code);
  return DEPARTEMENTS[normalizedCode] || DEPARTEMENTS[code] || code;
}
import type { DepartementSEO, CommuneSEO, EpciSEO, CoconSEOData } from "../domain/types";
import { generateDepartementSlug, generateCommuneSlug, generateEpciSlug } from "../utils/slug.utils";

import { fetchCommunesByDepartement, fetchEpci, delay, logger } from "./fetch-territoires";

// ============================================================================
// Types internes
// ============================================================================

interface CollectedData {
  departements: DepartementSEO[];
  communes: CommuneSEO[];
  epciCodes: Set<string>;
}

// ============================================================================
// Fonctions de traitement
// ============================================================================

/**
 * Traite les communes d'un département et retourne les données formatées
 */
async function processDepartement(
  codeDepartement: string,
  maxCommunes: number
): Promise<{
  departement: DepartementSEO;
  communes: CommuneSEO[];
  epciCodes: string[];
}> {
  const nomDepartement = getDepartementNom(codeDepartement);
  logger.progress(`Traitement du département ${codeDepartement} - ${nomDepartement}`);

  // Récupérer toutes les communes du département
  const communesApi = await fetchCommunesByDepartement(codeDepartement);
  logger.log(`  └─ ${communesApi.length} communes récupérées`);

  // Trier par population décroissante (0 si non renseignée)
  const communesTriees = communesApi
    .map((c) => ({ ...c, population: c.population ?? 0 }))
    .sort((a, b) => b.population - a.population);

  // Garder les X premières
  const communesSelectionnees = communesTriees.slice(0, maxCommunes);
  logger.log(`  └─ ${communesSelectionnees.length} communes sélectionnées (top population)`);

  // Collecter les codes EPCI uniques
  const epciCodes = [...new Set(communesSelectionnees.map((c) => c.codeEpci).filter((code): code is string => !!code))];
  logger.log(`  └─ ${epciCodes.length} EPCI associés`);

  // Construire les objets CommuneSEO
  const communes: CommuneSEO[] = communesSelectionnees.map((c) => ({
    codeInsee: c.code,
    nom: c.nom,
    slug: generateCommuneSlug(c.nom, c.code),
    population: c.population ?? 0,
    codeDepartement: c.codeDepartement,
    codeEpci: c.codeEpci,
    codesPostaux: c.codesPostaux || [],
  }));

  // Construire l'objet DepartementSEO
  const departement: DepartementSEO = {
    code: codeDepartement,
    nom: nomDepartement,
    slug: generateDepartementSlug(nomDepartement),
    population: communesApi.reduce((sum, c) => sum + (c.population ?? 0), 0),
    nombreCommunesRGA: communes.length,
    nombreEpciRGA: epciCodes.length,
  };

  return { departement, communes, epciCodes };
}

/**
 * Récupère les informations détaillées des EPCI
 */
async function processEpcis(epciCodes: Set<string>, communesByEpci: Map<string, CommuneSEO[]>): Promise<EpciSEO[]> {
  const epcis: EpciSEO[] = [];
  const epciArray = [...epciCodes];

  logger.progress(`\n Récupération des ${epciArray.length} EPCI...`);

  for (let i = 0; i < epciArray.length; i++) {
    const codeSiren = epciArray[i];

    try {
      const epciApi = await fetchEpci(codeSiren);
      const communesMembres = communesByEpci.get(codeSiren) || [];

      const epci: EpciSEO = {
        codeSiren: epciApi.code,
        nom: epciApi.nom,
        slug: generateEpciSlug(epciApi.nom, epciApi.code),
        codesDepartements: epciApi.codesDepartements || [],
        codesCommunes: communesMembres.map((c) => c.codeInsee),
        population: epciApi.population,
      };

      epcis.push(epci);
      logger.log(`  └─ [${i + 1}/${epciArray.length}] ${epci.nom}`);
    } catch (error) {
      logger.error(`  └─ Erreur EPCI ${codeSiren}:`, error);
    }

    // Rate limiting
    if (i < epciArray.length - 1) {
      await delay(API_GEO.delayBetweenCalls);
    }
  }

  return epcis;
}

/**
 * Met à jour les communes avec les noms des EPCI
 */
function enrichCommunesWithEpciNames(communes: CommuneSEO[], epcis: EpciSEO[]): CommuneSEO[] {
  const epciMap = new Map(epcis.map((e) => [e.codeSiren, e.nom]));

  return communes.map((commune) => ({
    ...commune,
    nomEpci: commune.codeEpci ? epciMap.get(commune.codeEpci) : undefined,
  }));
}

/**
 * Écrit les fichiers JSON générés
 */
function writeJsonFiles(data: CoconSEOData, outputDir: string): void {
  // Créer le dossier si nécessaire
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Écrire chaque fichier
  const files = [
    { name: "departements.json", content: data.departements },
    { name: "communes.json", content: data.communes },
    { name: "epci.json", content: data.epci },
    { name: "metadata.json", content: { generatedAt: data.generatedAt, config: data.config } },
  ];

  for (const file of files) {
    const filePath = path.join(outputDir, file.name);
    fs.writeFileSync(filePath, JSON.stringify(file.content, null, 2), "utf-8");
    logger.progress(`  └─ ${file.name} écrit (${JSON.stringify(file.content).length} bytes)`);
  }
}

// ============================================================================
// Script principal
// ============================================================================

async function main(): Promise<void> {
  const startTime = Date.now();

  console.log(" >>  GÉNÉRATION DU COCON SÉMANTIQUE SEO - RGA  <<");

  console.log(`\n Configuration:`);
  console.log(`   • Départements éligibles: ${DEPARTEMENTS_ELIGIBLES_RGA.length}`);
  console.log(`   • Communes par département: ${COMMUNES_PAR_DEPARTEMENT}`);
  console.log(`   • Délai entre appels API: ${API_GEO.delayBetweenCalls}ms`);
  console.log("");

  // Collecter les données
  const collected: CollectedData = {
    departements: [],
    communes: [],
    epciCodes: new Set<string>(),
  };

  // Map pour associer les communes à leur EPCI
  const communesByEpci = new Map<string, CommuneSEO[]>();

  // Traiter chaque département
  console.log(" Récupération des communes par département...\n");

  for (let i = 0; i < DEPARTEMENTS_ELIGIBLES_RGA.length; i++) {
    const codeDep = DEPARTEMENTS_ELIGIBLES_RGA[i];

    try {
      const result = await processDepartement(codeDep, COMMUNES_PAR_DEPARTEMENT);

      collected.departements.push(result.departement);
      collected.communes.push(...result.communes);
      result.epciCodes.forEach((code) => collected.epciCodes.add(code));

      // Grouper les communes par EPCI
      for (const commune of result.communes) {
        if (commune.codeEpci) {
          const existing = communesByEpci.get(commune.codeEpci) || [];
          existing.push(commune);
          communesByEpci.set(commune.codeEpci, existing);
        }
      }
    } catch (error) {
      logger.error(`Erreur département ${codeDep}:`, error);
    }

    // Rate limiting entre les départements
    if (i < DEPARTEMENTS_ELIGIBLES_RGA.length - 1) {
      await delay(API_GEO.delayBetweenCalls);
    }
  }

  // Récupérer les EPCI
  const epcis = await processEpcis(collected.epciCodes, communesByEpci);

  // Enrichir les communes avec les noms d'EPCI
  const communesEnrichies = enrichCommunesWithEpciNames(collected.communes, epcis);

  // Construire les données finales
  const coconData: CoconSEOData = {
    generatedAt: new Date().toISOString(),
    config: {
      communesParDepartement: COMMUNES_PAR_DEPARTEMENT,
      departementsEligibles: [...DEPARTEMENTS_ELIGIBLES_RGA],
    },
    departements: collected.departements,
    communes: communesEnrichies,
    epci: epcis,
  };

  // Écrire les fichiers - chemin relatif depuis le script
  const outputDir = path.join(__dirname, "../data/generated");

  console.log(`\n Écriture des fichiers dans ${outputDir}...`);
  writeJsonFiles(coconData, outputDir);

  // Résumé
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("\n >>  RÉSUMÉ  <<");
  console.log(`   • Départements: ${collected.departements.length}`);
  console.log(`   • Communes: ${communesEnrichies.length}`);
  console.log(`   • EPCI: ${epcis.length}`);
  console.log(`   • Durée: ${duration}s`);
  console.log("\n Génération terminée avec succès!\n");
}

// Exécuter le script
main().catch((error) => {
  console.error("\n Erreur fatale:", error);
  process.exit(1);
});
