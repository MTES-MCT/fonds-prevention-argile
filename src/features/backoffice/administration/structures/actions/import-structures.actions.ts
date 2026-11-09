"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRoleAccess } from "@/features/auth/server";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { hasPermission } from "@/features/auth/permissions/services/rbac.service";
import { UserRole } from "@/shared/domain/value-objects";
import type { ActionResult } from "@/shared/types";
import type { BilanImportStructures } from "../domain/import-structures";
import { importerStructures } from "../services/import-structures.service";

const TAILLE_MAX_IMPORT = 2 * 1024 * 1024;

const PERMISSION_IMPORT = {
  amo: BackofficePermission.AMO_IMPORT,
  allersVers: BackofficePermission.ALLERS_VERS_IMPORT,
  expert: BackofficePermission.EXPERTS_WRITE,
} as const;

const optionsSchema = z.object({
  role: z.enum(["amo", "allersVers", "expert"]),
  remplacer: z.enum(["oui", "non"]).default("non"),
});

/** Importe le fichier d'un rôle (AMO, Aller-vers ou experts) ; le rôle relu en base décide de ce qu'il peut écrire. */
export async function importerStructuresAction(formData: FormData): Promise<ActionResult<BilanImportStructures>> {
  const acces = await checkRoleAccess([UserRole.SUPER_ADMINISTRATEUR, UserRole.ADMINISTRATEUR]);
  if (!acces.hasAccess || !acces.user) return { success: false, error: "Accès non autorisé." };
  const role = acces.user.role as UserRole;

  const options = optionsSchema.safeParse({
    role: formData.get("role"),
    remplacer: formData.get("remplacer") ?? undefined,
  });
  if (!options.success) return { success: false, error: "Rôle à importer inconnu" };
  if (!hasPermission(role, PERMISSION_IMPORT[options.data.role])) {
    return { success: false, error: "Permission insuffisante pour importer ce rôle." };
  }

  const fichier = formData.get("file");
  if (!(fichier instanceof File)) return { success: false, error: "Aucun fichier fourni" };
  if (!fichier.name.toLowerCase().endsWith(".xlsx")) {
    return { success: false, error: "Le fichier doit être au format Excel (.xlsx)" };
  }
  if (fichier.size > TAILLE_MAX_IMPORT) return { success: false, error: "Fichier trop volumineux (2 Mo au plus)" };

  try {
    const bilan = await importerStructures(await fichier.arrayBuffer(), {
      role: options.data.role,
      peutChangerRoles: role === UserRole.SUPER_ADMINISTRATEUR,
      remplacer: options.data.remplacer === "oui",
    });
    if ("erreur" in bilan) return { success: false, error: bilan.erreur };
    console.info(
      `[structures] Import ${options.data.role} par l'agent ${acces.user.agentId ?? "inconnu"} : ${bilan.structuresCreees} créées, ${bilan.structuresMisesAJour} existantes, ${bilan.lignesRefusees.length} lignes refusées`
    );
    revalidatePath("/rga", "layout");
    return { success: true, data: bilan };
  } catch (error) {
    console.error("[importerStructuresAction]", error instanceof Error ? error.name : "erreur inconnue");
    return { success: false, error: "Erreur inattendue, l'import n'a pas été enregistré" };
  }
}
