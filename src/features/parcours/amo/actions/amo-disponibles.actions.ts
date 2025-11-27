"use server";

import { getSession } from "@/features/auth/server";
import type { ActionResult } from "@/shared/types";
import { Amo } from "../domain/entities";
import { db, entreprisesAmo, entreprisesAmoCommunes, entreprisesAmoEpci } from "@/shared/database";
import { eq, like } from "drizzle-orm";
import { getCodeDepartementFromCodeInsee, normalizeCodeInsee } from "../utils/amo.utils";
import { parcoursRepo } from "@/shared/database/repositories";
import { isAdminRole } from "@/shared/domain/value-objects";

/**
 * Récupère la liste des AMO disponibles pour le territoire de l'utilisateur
 *
 * Logique de sélection EXCLUSIVE :
 * 1. Si des AMO couvrent l'EPCI du citoyen → retourner UNIQUEMENT ces AMO
 * 2. Sinon, si des AMO couvrent le département → retourner UNIQUEMENT ces AMO
 * 3. Ne JAMAIS mélanger des AMO trouvés par EPCI avec ceux trouvés par département
 *
 * Note : Les codes INSEE spécifiques (entreprises_amo_communes) ne sont pas utilisés dans cette version
 */
export async function getAmosDisponibles(): Promise<ActionResult<Amo[]>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    const parcours = await parcoursRepo.findByUserId(session.userId);

    if (!parcours?.rgaSimulationData?.logement?.commune) {
      return {
        success: false,
        error: "Simulation RGA non complétée (code INSEE manquant)",
      };
    }

    // Extraire le code INSEE
    const codeInsee = normalizeCodeInsee(parcours.rgaSimulationData.logement.commune);

    if (!codeInsee) {
      return {
        success: false,
        error: "Simulation RGA non complétée (code INSEE invalide)",
      };
    }

    // Extraire le code département
    const codeDepartement = getCodeDepartementFromCodeInsee(codeInsee);

    // Extraire le code EPCI (si disponible)
    const codeEpci = parcours.rgaSimulationData.logement?.epci
      ? String(parcours.rgaSimulationData.logement.epci).trim()
      : null;

    // 1. Récupérer les AMO qui couvrent l'EPCI spécifique (si disponible)
    const amosParEpci = codeEpci
      ? await db
          .selectDistinct({
            id: entreprisesAmo.id,
            nom: entreprisesAmo.nom,
            siret: entreprisesAmo.siret,
            departements: entreprisesAmo.departements,
            emails: entreprisesAmo.emails,
            telephone: entreprisesAmo.telephone,
            adresse: entreprisesAmo.adresse,
          })
          .from(entreprisesAmo)
          .innerJoin(entreprisesAmoEpci, eq(entreprisesAmo.id, entreprisesAmoEpci.entrepriseAmoId))
          .where(eq(entreprisesAmoEpci.codeEpci, codeEpci))
      : [];

    // Si des AMO couvrent l'EPCI, retourner UNIQUEMENT ceux-là (logique exclusive)
    if (amosParEpci.length > 0) {
      return {
        success: true,
        data: amosParEpci,
      };
    }

    // 2. Sinon, récupérer les AMO qui couvrent le département entier (fallback)
    const amosParDepartement = await db
      .select({
        id: entreprisesAmo.id,
        nom: entreprisesAmo.nom,
        siret: entreprisesAmo.siret,
        departements: entreprisesAmo.departements,
        emails: entreprisesAmo.emails,
        telephone: entreprisesAmo.telephone,
        adresse: entreprisesAmo.adresse,
      })
      .from(entreprisesAmo)
      .where(like(entreprisesAmo.departements, `%${codeDepartement}%`));

    return {
      success: true,
      data: amosParDepartement,
    };

    // Note : Code INSEE spécifique désactivé dans cette version
    // const amosParCodeInsee = await db
    //   .selectDistinct({...})
    //   .from(entreprisesAmo)
    //   .innerJoin(entreprisesAmoCommunes, ...)
    //   .where(eq(entreprisesAmoCommunes.codeInsee, codeInsee));
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
      throw new Error("Accès refusé");
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
