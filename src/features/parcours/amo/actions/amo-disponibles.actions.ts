"use server";

import { getSession } from "@/features/auth/server";
import type { ActionResult } from "@/shared/types";
import { Amo } from "../domain/entities";
import { db, entreprisesAmo, entreprisesAmoCommunes, entreprisesAmoEpci } from "@/shared/database";
import { eq } from "drizzle-orm";
import { parcoursRepo } from "@/shared/database/repositories";
import { territoireDuParcours } from "../domain/value-objects/couverture-amo";
import { listerAmosDuTerritoire } from "../services/amo-couverture.service";
import { isAdminRole } from "@/shared/domain/value-objects";

/**
 * AMO proposées au demandeur connecté pour son territoire : celles du niveau le plus précis
 * (commune, puis EPCI, puis département), dans l'ordre de `listerAmosDuTerritoire`.
 */
export async function getAmosDisponibles(): Promise<ActionResult<Amo[]>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const parcours = await parcoursRepo.findByUserId(session.userId);
    // USER-first avec repli agent : un dossier créé par un Aller-vers n'a parfois que la sienne.
    const territoire = parcours ? territoireDuParcours(parcours) : null;
    if (!territoire) {
      return { success: false, error: "Simulation RGA non complétée (code INSEE manquant)" };
    }

    return { success: true, data: await listerAmosDuTerritoire(territoire) };
  } catch (error) {
    console.error("Erreur getAmosDisponibles:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des AMO",
    };
  }
}

/**
 * Récupère la liste de tous les AMO avec leurs codes INSEE et EPCI
 */
export async function getAllAmos(): Promise<ActionResult<Array<Amo & { communes: { codeInsee: string }[] }>>> {
  try {
    const session = await getSession();

    if (!session || !isAdminRole(session.role)) {
      throw new Error("Accès réservé aux administrateurs");
    }

    // Récupérer les AMO avec leurs communes et EPCI
    const allAmosWithRelations = await db
      .select({
        id: entreprisesAmo.id,
        nom: entreprisesAmo.nom,
        siret: entreprisesAmo.siret,
        departements: entreprisesAmo.departements,
        emails: entreprisesAmo.emails,
        telephone: entreprisesAmo.telephone,
        adresse: entreprisesAmo.adresse,
        horaires: entreprisesAmo.horaires,
        codeInsee: entreprisesAmoCommunes.codeInsee,
        codeEpci: entreprisesAmoEpci.codeEpci,
      })
      .from(entreprisesAmo)
      .leftJoin(entreprisesAmoCommunes, eq(entreprisesAmo.id, entreprisesAmoCommunes.entrepriseAmoId))
      .leftJoin(entreprisesAmoEpci, eq(entreprisesAmo.id, entreprisesAmoEpci.entrepriseAmoId))
      .orderBy(entreprisesAmo.nom);

    // Grouper les codes INSEE et EPCI par AMO
    const amosMap = new Map<string, Amo & { communes: { codeInsee: string }[]; epci: { codeEpci: string }[] }>();

    for (const row of allAmosWithRelations) {
      if (!amosMap.has(row.id)) {
        amosMap.set(row.id, {
          id: row.id,
          nom: row.nom,
          siret: row.siret,
          departements: row.departements,
          emails: row.emails,
          telephone: row.telephone,
          adresse: row.adresse,
          horaires: row.horaires,
          communes: [],
          epci: [],
        });
      }

      const amo = amosMap.get(row.id);
      if (amo) {
        // Ajouter le code INSEE s'il existe et n'est pas déjà présent
        if (row.codeInsee && !amo.communes.some((c) => c.codeInsee === row.codeInsee)) {
          amo.communes.push({ codeInsee: row.codeInsee });
        }
        // Ajouter le code EPCI s'il existe et n'est pas déjà présent
        if (row.codeEpci && !amo.epci.some((e) => e.codeEpci === row.codeEpci)) {
          amo.epci.push({ codeEpci: row.codeEpci });
        }
      }
    }

    return {
      success: true,
      data: Array.from(amosMap.values()),
    };
  } catch (error) {
    console.error("Erreur getAllAmos:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des AMO",
    };
  }
}
