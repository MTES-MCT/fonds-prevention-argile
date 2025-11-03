"use server";

import { getSession } from "@/features/auth/server";
import { ROLES } from "@/features/auth/domain/value-objects/constants";
import type { ActionResult } from "@/shared/types";
import { Amo } from "../domain/entities";
import {
  db,
  entreprisesAmo,
  entreprisesAmoCommunes,
  users,
} from "@/shared/database";
import { eq, like } from "drizzle-orm";
import { getCodeDepartementFromCodeInsee } from "../utils/amo.utils";

/**
 * Récupère la liste des AMO disponibles pour le code INSEE de l'utilisateur
 * Recherche par :
 * 1. Code INSEE exact dans entreprises_amo_communes (prioritaire)
 * 2. Code département extrait du code INSEE dans le champ departements
 */
export async function getAmosDisponibles(): Promise<ActionResult<Amo[]>> {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { success: false, error: "Non connecté" };
    }

    // Récupérer le code INSEE de l'utilisateur
    const [user] = await db
      .select({ codeInsee: users.codeInsee })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user?.codeInsee) {
      return {
        success: false,
        error: "Code INSEE non renseigné pour cet utilisateur",
      };
    }

    // Extraire le code département
    const codeDepartement = getCodeDepartementFromCodeInsee(user.codeInsee);

    // 1. Récupérer les AMO qui ont le code INSEE spécifique
    const amosParCodeInsee = await db
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
      .innerJoin(
        entreprisesAmoCommunes,
        eq(entreprisesAmo.id, entreprisesAmoCommunes.entrepriseAmoId)
      )
      .where(eq(entreprisesAmoCommunes.codeInsee, user.codeInsee));

    // 2. Récupérer les AMO qui couvrent le département entier
    // Format recherché : "Seine-et-Marne 77" ou "Gers 32"
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

    // Fusionner et dédupliquer les résultats par ID
    const amosMap = new Map<string, Amo>();

    for (const amo of [...amosParCodeInsee, ...amosParDepartement]) {
      if (!amosMap.has(amo.id)) {
        amosMap.set(amo.id, amo);
      }
    }

    const amosDisponibles = Array.from(amosMap.values());

    return {
      success: true,
      data: amosDisponibles,
    };
  } catch (error) {
    console.error("Erreur getAmosDisponibles:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des AMO",
    };
  }
}

/**
 * Récupère la liste de tous les AMO avec leurs codes INSEE
 */
export async function getAllAmos(): Promise<
  ActionResult<Array<Amo & { communes: { codeInsee: string }[] }>>
> {
  try {
    const session = await getSession();

    if (!session || session.role !== ROLES.ADMIN) {
      throw new Error("Accès refusé");
    }

    // Récupérer les AMO avec leurs communes
    const allAmosWithCommunes = await db
      .select({
        id: entreprisesAmo.id,
        nom: entreprisesAmo.nom,
        siret: entreprisesAmo.siret,
        departements: entreprisesAmo.departements,
        emails: entreprisesAmo.emails,
        telephone: entreprisesAmo.telephone,
        adresse: entreprisesAmo.adresse,
        codeInsee: entreprisesAmoCommunes.codeInsee,
      })
      .from(entreprisesAmo)
      .leftJoin(
        entreprisesAmoCommunes,
        eq(entreprisesAmo.id, entreprisesAmoCommunes.entrepriseAmoId)
      )
      .orderBy(entreprisesAmo.nom);

    // Grouper les codes INSEE par AMO
    const amosMap = new Map<
      string,
      Amo & { communes: { codeInsee: string }[] }
    >();

    for (const row of allAmosWithCommunes) {
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
        });
      }

      const amo = amosMap.get(row.id);
      if (amo && row.codeInsee) {
        amo.communes.push({ codeInsee: row.codeInsee });
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
