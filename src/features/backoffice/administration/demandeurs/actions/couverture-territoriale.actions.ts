"use server";

import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { getDepartementsNonCouverts } from "@/features/backoffice/administration/shared/services/couverture-territoriale.service";
import type { ActionResult } from "@/shared/types";

/**
 * Départements éligibles sans AMO ni Aller-vers, pour signaler dans le listing les
 * demandeurs qui ne seront adressés à personne.
 *
 * Permission : USERS_READ — l'information n'est pas nominative, mais elle n'a d'usage
 * que sur la liste nominative, qui porte déjà cette garde.
 */
export async function getDepartementsNonCouvertsAction(): Promise<ActionResult<string[]>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.USERS_READ);

  if (!permissionCheck.hasAccess) {
    return { success: false, error: "Permission insuffisante" };
  }

  try {
    return { success: true, data: await getDepartementsNonCouverts() };
  } catch (error) {
    console.error("Erreur getDepartementsNonCouvertsAction:", error);
    return { success: false, error: "Erreur lors de la récupération de la couverture territoriale" };
  }
}
