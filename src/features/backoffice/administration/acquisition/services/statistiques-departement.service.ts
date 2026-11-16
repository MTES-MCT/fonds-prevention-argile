import { isNotNull, or } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { parcoursPrevention } from "@/shared/database/schema";
import { normalizeCodeDepartement } from "@/shared/constants/departements.constants";
import { ordonnerDepartementsDisponibles } from "../domain/departements-disponibles";
import type { DepartementDisponible } from "../domain/types";

/**
 * Récupère la liste des départements ayant des parcours, ceux du fonds en tête.
 */
export async function getAvailableDepartements(): Promise<DepartementDisponible[]> {
  // Simulation du demandeur OU de l'agent : un dossier créé par un agent n'a que la seconde.
  const parcours = await db
    .select({
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
      rgaSimulationDataAgent: parcoursPrevention.rgaSimulationDataAgent,
    })
    .from(parcoursPrevention)
    .where(or(isNotNull(parcoursPrevention.rgaSimulationData), isNotNull(parcoursPrevention.rgaSimulationDataAgent)));

  // Group by code_departement en JS, normalisé pour éviter les doublons
  // Le JSONB peut contenir : number 3, string "03", string "3" → tous normalisés en "3"
  const deptMap = new Map<string, number>();

  for (const p of parcours) {
    const data = p.rgaSimulationDataAgent ?? p.rgaSimulationData;
    const codeDept = data?.logement?.code_departement;
    if (!codeDept) continue;
    const codeDeptNormalized = normalizeCodeDepartement(codeDept);
    deptMap.set(codeDeptNormalized, (deptMap.get(codeDeptNormalized) ?? 0) + 1);
  }

  return ordonnerDepartementsDisponibles(deptMap);
}
