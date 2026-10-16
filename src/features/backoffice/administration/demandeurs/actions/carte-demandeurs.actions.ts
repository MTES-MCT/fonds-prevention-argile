"use server";

import { z } from "zod";
import { checkBackofficePermission } from "@/features/auth/permissions/services/permissions.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { CODE_COMMUNE_REGEX } from "../domain/carte-communes.utils";
import { getCentresCommunes, type ResultatCentresCommunes } from "../services/centres-communes.service";
import type { ActionResult } from "@/shared/types";

// Borne large (≈ 35 000 communes en France) : protège seulement d'une charge utile abusive.
const CodesCommunesSchema = z.array(z.string().regex(CODE_COMMUNE_REGEX)).max(40_000);

/**
 * Centres des communes où vivent les demandeurs, pour la carte des demandeurs.
 *
 * Permission : USERS_STATS_READ — donnée publique (découpage administratif), mais la carte
 * n'a d'usage que dans les stats Demandeurs, qui portent cette garde.
 */
export async function getCentresCommunesAction(codesCommunes: unknown): Promise<ActionResult<ResultatCentresCommunes>> {
  const permissionCheck = await checkBackofficePermission(BackofficePermission.USERS_STATS_READ);

  if (!permissionCheck.hasAccess) {
    return { success: false, error: "Permission insuffisante" };
  }

  const parsed = CodesCommunesSchema.safeParse(codesCommunes);
  if (!parsed.success) {
    return { success: false, error: "Codes de communes invalides" };
  }

  try {
    return { success: true, data: await getCentresCommunes(parsed.data) };
  } catch (error) {
    console.error("Erreur getCentresCommunesAction:", error);
    return { success: false, error: "Erreur lors de la récupération des communes" };
  }
}
