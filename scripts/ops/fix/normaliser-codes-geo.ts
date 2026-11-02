/**
 * Remet au format officiel les codes géographiques stockés en nombres dans les simulations.
 *
 * Contexte
 * --------
 * Les simulations de 2025 stockent `code_departement`, `commune`, `epci` et `code_region` en
 * nombres (3, 3023). Comparés en chaîne, « 3 » ne retrouve jamais « 03 » : ces dossiers
 * disparaissaient du listing, du détail et des stats des agents des départements 01 à 09.
 * `matchesTerritoire` normalise désormais à la lecture ; ce script corrige les données pour
 * tous les autres lecteurs (couverture AMO par commune, responsable, filtres).
 *
 * Colonnes traitées : `rga_simulation_data`, `rga_simulation_data_agent` et son baseline.
 * `updated_at` est conservé : un changement de format n'est pas une activité du dossier.
 *
 * Usage
 *   pnpm fix:codes-geo                             # dry-run : inventaire, aucune écriture
 *   pnpm fix:codes-geo --apply                     # corrige tout l'inventaire (une transaction)
 *   pnpm fix:codes-geo --parcours-id=<uuid> --apply
 *
 * Pré-requis : .env.local (ou vars Scalingo) avec la config DB.
 */

import "../lib/env";
import { eq } from "drizzle-orm";
import { db, rawClient } from "@/shared/database/client";
import { parcoursPrevention } from "@/shared/database/schema";
import type { RGASimulationData } from "@/shared/domain/types";
import { getArg, hasFlag } from "../lib/args";
import { normaliserCodesGeo } from "../lib/codes-geo";

const APPLY = hasFlag("apply");
const PARCOURS_ID = getArg("parcours-id");

const COLONNES = ["rgaSimulationData", "rgaSimulationDataAgent", "rgaSimulationDataAgentBaseline"] as const;
type Colonne = (typeof COLONNES)[number];

interface Correction {
  parcoursId: string;
  updatedAt: Date;
  valeurs: Partial<Record<Colonne, RGASimulationData>>;
}

const line = () => console.log("-".repeat(90));

async function main() {
  line();
  console.log(`CODES GÉOGRAPHIQUES — ${APPLY ? "APPLY (écriture)" : "DRY-RUN (aucune écriture)"}`);
  line();

  const rows = await db
    .select({
      id: parcoursPrevention.id,
      updatedAt: parcoursPrevention.updatedAt,
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
      rgaSimulationDataAgent: parcoursPrevention.rgaSimulationDataAgent,
      rgaSimulationDataAgentBaseline: parcoursPrevention.rgaSimulationDataAgentBaseline,
    })
    .from(parcoursPrevention)
    .where(PARCOURS_ID ? eq(parcoursPrevention.id, PARCOURS_ID) : undefined);

  const corrections: Correction[] = [];
  const parChamp = new Map<string, number>();
  const transitionsDepartement = new Map<string, number>();

  for (const row of rows) {
    const valeurs: Correction["valeurs"] = {};
    for (const colonne of COLONNES) {
      const { simulation, changements } = normaliserCodesGeo(row[colonne]);
      if (changements.length === 0) continue;
      valeurs[colonne] = simulation as RGASimulationData;
      for (const c of changements) {
        const cle = `${colonne}.${c.champ}`;
        parChamp.set(cle, (parChamp.get(cle) ?? 0) + 1);
        if (c.champ === "code_departement") {
          const transition = `${JSON.stringify(c.avant)} -> "${String(c.apres)}"`;
          transitionsDepartement.set(transition, (transitionsDepartement.get(transition) ?? 0) + 1);
        }
      }
    }
    if (Object.keys(valeurs).length > 0) corrections.push({ parcoursId: row.id, updatedAt: row.updatedAt, valeurs });
  }

  console.log(`${rows.length} parcours lus, ${corrections.length} à corriger.`);
  if (corrections.length === 0) {
    await rawClient.end();
    return;
  }

  console.log();
  console.log("Champs corrigés (colonne.champ : nombre de parcours) :");
  for (const [cle, nb] of [...parChamp.entries()].sort()) console.log(`  ${cle.padEnd(50)} ${nb}`);

  console.log();
  console.log("Départements (avant -> après : nombre de simulations) :");
  for (const [transition, nb] of [...transitionsDepartement.entries()].sort()) {
    console.log(`  ${transition.padEnd(50)} ${nb}`);
  }

  if (!APPLY) {
    console.log();
    console.log("Dry-run : relancer avec --apply pour écrire.");
    await rawClient.end();
    return;
  }

  await db.transaction(async (tx) => {
    for (const c of corrections) {
      await tx
        .update(parcoursPrevention)
        .set({ ...c.valeurs, updatedAt: c.updatedAt })
        .where(eq(parcoursPrevention.id, c.parcoursId));
    }
  });

  console.log();
  console.log(`${corrections.length} parcours corrigés.`);
  await rawClient.end();
}

main().catch(async (error) => {
  console.error("Échec :", error instanceof Error ? error.name : "erreur inconnue");
  await rawClient.end();
  process.exit(1);
});
