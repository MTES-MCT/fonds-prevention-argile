"use server";

import { getSession } from "@/features/auth/server";
import { ROLES } from "@/features/auth/domain/value-objects/constants";
import { getUsersWithParcours as getUsersWithParcoursService } from "../services/users-tracking.service";
import type { ActionResult } from "@/shared/types";
import type { UserWithParcoursDetails } from "../domain/types/user-with-parcours.types";

/**
 * Récupère tous les utilisateurs avec leurs parcours (admin uniquement)
 */
export async function getUsersWithParcours(): Promise<ActionResult<UserWithParcoursDetails[]>> {
  try {
    const session = await getSession();

    if (!session?.userId || session.role !== ROLES.ADMIN) {
      return {
        success: false,
        error: "Accès non autorisé. Réservé aux administrateurs.",
      };
    }

    const users = await getUsersWithParcoursService();

    return {
      success: true,
      data: users,
    };
  } catch (error) {
    console.error("Erreur getUsersWithParcours:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}
