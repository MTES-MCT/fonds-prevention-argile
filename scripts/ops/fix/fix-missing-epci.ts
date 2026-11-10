/**
 * Script pour corriger les parcours prévention avec un EPCI manquant
 * en se basant sur l'API geo.gouv.fr
 * 10 parcours concernés au 14/01/2026
 *
 * Usage : pnpm fix:epci (dry-run, n'écrit rien) puis pnpm fix:epci --apply
 **/
import { db } from "@/shared/database/client";
import { parcoursPrevention } from "@/shared/database/schema/parcours-prevention";
import { sql } from "drizzle-orm";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import { hasFlag } from "../lib/args";

const APPLY = hasFlag("apply");

interface ParcoursWithoutEpci {
  id: string;
  userId: string;
  codeCommune: string;
  nomCommune: string;
  rgaSimulationData: RGASimulationData;
}

/**
 * Récupère l'EPCI d'une commune via l'API geo.gouv.fr
 */
async function getEpciFromCommune(codeCommune: string): Promise<string | null> {
  try {
    const response = await fetch(`https://geo.api.gouv.fr/communes/${codeCommune}?fields=codeEpci`);

    if (!response.ok) {
      console.error(`❌ Erreur API pour commune ${codeCommune}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.codeEpci || null;
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération EPCI pour ${codeCommune}:`, error);
    return null;
  }
}

/**
 * Récupère tous les parcours sans EPCI
 */
async function getParcoursWithoutEpci(): Promise<ParcoursWithoutEpci[]> {
  const results = await db.execute(sql`
    SELECT 
      pp.id,
      pp.user_id,
      pp.rga_simulation_data->'logement'->>'commune' as code_commune,
      pp.rga_simulation_data->'logement'->>'commune_nom' as nom_commune,
      pp.rga_simulation_data
    FROM parcours_prevention pp
    WHERE 
      pp.rga_simulation_data IS NOT NULL
      AND (
        pp.rga_simulation_data->'logement'->>'epci' IS NULL 
        OR pp.rga_simulation_data->'logement'->>'epci' = ''
      )
    ORDER BY pp.rga_simulation_completed_at DESC
  `);

  return results.map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    codeCommune: row.code_commune as string,
    nomCommune: row.nom_commune as string,
    rgaSimulationData: row.rga_simulation_data as RGASimulationData,
  }));
}

/**
 * Met à jour un parcours avec l'EPCI
 */
async function updateParcoursWithEpci(parcoursId: string, rgaData: RGASimulationData, epci: string): Promise<boolean> {
  try {
    const updatedRgaData: RGASimulationData = {
      ...rgaData,
      logement: {
        ...rgaData.logement,
        epci,
      },
    };

    await db
      .update(parcoursPrevention)
      .set({
        rgaSimulationData: updatedRgaData,
      })
      .where(sql`${parcoursPrevention.id} = ${parcoursId}`);

    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de la mise à jour du parcours ${parcoursId}:`, error);
    return false;
  }
}

/**
 * Script principal de correction
 */
async function fixMissingEpci() {
  console.log(`Correction des EPCI manquants — ${APPLY ? "APPLY" : "DRY-RUN (aucune écriture)"}\n`);

  // 1. Récupérer les parcours sans EPCI
  console.log("📊 Récupération des parcours sans EPCI...");
  const parcours = await getParcoursWithoutEpci();
  console.log(`✅ ${parcours.length} parcours trouvés sans EPCI\n`);

  if (parcours.length === 0) {
    console.log("✨ Aucun parcours à corriger !");
    return;
  }

  // 2. Corriger chaque parcours
  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ parcoursId: string; commune: string; error: string }> = [];

  for (let i = 0; i < parcours.length; i++) {
    const p = parcours[i];
    console.log(`\n[${i + 1}/${parcours.length}] Traitement du parcours ${p.id}`);
    console.log(`   📍 Commune: ${p.nomCommune} (${p.codeCommune})`);

    // Récupérer l'EPCI
    const epci = await getEpciFromCommune(p.codeCommune);

    if (!epci) {
      console.log(`   ⚠️  EPCI non trouvé pour ${p.codeCommune}`);
      errorCount++;
      errors.push({
        parcoursId: p.id,
        commune: `${p.nomCommune} (${p.codeCommune})`,
        error: "EPCI non trouvé via API",
      });
      continue;
    }

    console.log(`   ✅ EPCI trouvé: ${epci}`);

    if (!APPLY) {
      console.log(`   [dry-run] serait mis à jour avec l'EPCI ${epci}`);
      successCount++;
      await new Promise((resolve) => setTimeout(resolve, 100));
      continue;
    }

    // Mettre à jour le parcours
    const updated = await updateParcoursWithEpci(p.id, p.rgaSimulationData, epci);

    if (updated) {
      console.log(`   💾 Parcours mis à jour avec succès`);
      successCount++;
    } else {
      console.log(`   ❌ Erreur lors de la mise à jour`);
      errorCount++;
      errors.push({
        parcoursId: p.id,
        commune: `${p.nomCommune} (${p.codeCommune})`,
        error: "Erreur lors de la mise à jour en base",
      });
    }

    // Pause pour éviter de surcharger l'API
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // 3. Résumé
  console.log("\n" + "=".repeat(60));
  console.log("📊 RÉSUMÉ DE LA CORRECTION");
  console.log("=".repeat(60));
  console.log(`✅ ${APPLY ? "Succès" : "À corriger (relancer avec --apply)"}: ${successCount}`);
  console.log(`❌ Erreurs: ${errorCount}`);
  console.log(`📝 Total traité: ${parcours.length}`);

  if (errors.length > 0) {
    console.log("\n❌ ERREURS DÉTAILLÉES:");
    errors.forEach((err, idx) => {
      console.log(`\n${idx + 1}. Parcours: ${err.parcoursId}`);
      console.log(`   Commune: ${err.commune}`);
      console.log(`   Erreur: ${err.error}`);
    });
  }

  console.log("\n✨ Script terminé !");
}

// Exécution du script
fixMissingEpci()
  .then(() => {
    console.log("\n👋 Fin du script !");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Erreur fatale:", error);
    process.exit(1);
  });
