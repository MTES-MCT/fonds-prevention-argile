// Remet au format officiel les codes géographiques stockés en nombres dans les simulations (ADR-0050).
// Usage : scripts/ops/README.md § normaliser-codes-geo. Dry-run par défaut.

import "../lib/env";
import { eq } from "drizzle-orm";
import { db, rawClient } from "@/shared/database/client";
import { parcoursPrevention } from "@/shared/database/schema";
import type { RGASimulationData } from "@/shared/domain/types";
import { resumerErreur } from "@/shared/utils/erreur.utils";
import { getArg, hasFlag } from "../lib/args";
import { normaliserCodesGeo } from "../lib/codes-geo";

const APPLY = hasFlag("apply");
const PARCOURS_ID = getArg("parcours-id");

const COLONNES = ["rgaSimulationData", "rgaSimulationDataAgent", "rgaSimulationDataAgentBaseline"] as const;
type Colonne = (typeof COLONNES)[number];
type Executeur = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

interface Correction {
  parcoursId: string;
  updatedAt: Date;
  valeurs: Partial<Record<Colonne, RGASimulationData>>;
}

const line = () => console.log("-".repeat(90));

// Verrouillées en écriture : une correction d'agent concurrente attend la fin, au lieu d'être écrasée.
async function lireParcours(exec: Executeur, verrouiller: boolean) {
  const requete = exec
    .select({
      id: parcoursPrevention.id,
      updatedAt: parcoursPrevention.updatedAt,
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
      rgaSimulationDataAgent: parcoursPrevention.rgaSimulationDataAgent,
      rgaSimulationDataAgentBaseline: parcoursPrevention.rgaSimulationDataAgentBaseline,
    })
    .from(parcoursPrevention)
    .where(PARCOURS_ID ? eq(parcoursPrevention.id, PARCOURS_ID) : undefined);
  return verrouiller ? requete.for("update") : requete;
}

function planifier(rows: Awaited<ReturnType<typeof lireParcours>>) {
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

  return { lus: rows.length, corrections, parChamp, transitionsDepartement };
}

function afficher(plan: ReturnType<typeof planifier>) {
  console.log(`${plan.lus} parcours lus, ${plan.corrections.length} à corriger.`);
  if (plan.corrections.length === 0) return;

  console.log();
  console.log("Champs corrigés (colonne.champ : nombre de parcours) :");
  for (const [cle, nb] of [...plan.parChamp.entries()].sort()) console.log(`  ${cle.padEnd(50)} ${nb}`);

  console.log();
  console.log("Départements (avant -> après : nombre de simulations) :");
  for (const [transition, nb] of [...plan.transitionsDepartement.entries()].sort()) {
    console.log(`  ${transition.padEnd(50)} ${nb}`);
  }
}

async function main() {
  line();
  console.log(`CODES GÉOGRAPHIQUES — ${APPLY ? "APPLY (écriture)" : "DRY-RUN (aucune écriture)"}`);
  line();

  if (!APPLY) {
    afficher(planifier(await lireParcours(db, false)));
    console.log();
    console.log("Dry-run : relancer avec --apply pour écrire.");
    return;
  }

  // Lecture et écriture dans la même transaction : le plan appliqué est celui des lignes verrouillées.
  const nbCorriges = await db.transaction(async (tx) => {
    const plan = planifier(await lireParcours(tx, true));
    afficher(plan);
    for (const c of plan.corrections) {
      await tx
        .update(parcoursPrevention)
        .set({ ...c.valeurs, updatedAt: c.updatedAt })
        .where(eq(parcoursPrevention.id, c.parcoursId));
    }
    return plan.corrections.length;
  });

  console.log();
  console.log(`${nbCorriges} parcours corrigés.`);
}

main()
  .catch((error) => {
    console.error("Échec :", resumerErreur(error));
    process.exitCode = 1;
  })
  .finally(() => rawClient.end());
