"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { hasPermission } from "@/features/auth/permissions/services/rbac.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { UserRole } from "@/shared/domain/value-objects";
import { qualificationService } from "../services/qualification.service";
import type { ProspectQualification } from "@/shared/database/schema/prospect-qualifications";
import type { ActionResult } from "@/shared/types";

// --- Validation Zod ---

const qualifyProspectSchema = z
  .object({
    parcoursId: z.string().uuid(),
    decision: z.enum(["eligible", "a_qualifier", "non_eligible"]),
    actionsRealisees: z.array(z.string()).min(1, "Au moins une action est requise"),
    raisonsIneligibilite: z.array(z.string()).optional(),
    note: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.decision === "non_eligible") {
        return data.raisonsIneligibilite && data.raisonsIneligibilite.length > 0;
      }
      return true;
    },
    {
      message: "Au moins une raison d'inéligibilité est requise",
      path: ["raisonsIneligibilite"],
    },
  );

type QualifyProspectInput = z.infer<typeof qualifyProspectSchema>;

// --- Actions ---

/**
 * Qualifie un prospect (éligible, non éligible, à qualifier)
 *
 * Vérifie que l'agent connecté est un agent Allers-Vers.
 */
export async function qualifyProspectAction(
  input: QualifyProspectInput,
): Promise<ActionResult<ProspectQualification>> {
  try {
    // 1. Authentification
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Non authentifié" };
    }

    // 2. Permissions
    const role = user.role as UserRole;
    if (!hasPermission(role, BackofficePermission.PROSPECTS_VIEW)) {
      return { success: false, error: "Permission refusée" };
    }

    // 3. Agent lié à une structure Allers-Vers
    if (!user.allersVersId) {
      return { success: false, error: "Agent non lié à une structure Allers-Vers" };
    }

    if (!user.agentId) {
      return { success: false, error: "Agent non configuré" };
    }

    // 4. Validation Zod
    const parsed = qualifyProspectSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Données invalides";
      return { success: false, error: firstError };
    }

    const { parcoursId, decision, actionsRealisees, raisonsIneligibilite, note } = parsed.data;

    // 5. Logique métier
    const qualification = await qualificationService.qualifyProspect({
      parcoursId,
      agentId: user.agentId,
      decision,
      actionsRealisees,
      raisonsIneligibilite,
      note,
    });

    // 6. Invalidation du cache
    revalidatePath("/espace-agent", "layout");

    return { success: true, data: qualification };
  } catch (error) {
    console.error("[qualifyProspectAction] Erreur:", error);
    return { success: false, error: "Erreur lors de la qualification du prospect" };
  }
}

/**
 * Récupère la dernière qualification d'un prospect
 */
export async function getProspectQualificationAction(
  parcoursId: string,
): Promise<ActionResult<ProspectQualification | null>> {
  try {
    // 1. Authentification
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Non authentifié" };
    }

    // 2. Permissions
    const role = user.role as UserRole;
    if (!hasPermission(role, BackofficePermission.PROSPECTS_VIEW)) {
      return { success: false, error: "Permission refusée" };
    }

    // 3. Agent lié à une structure Allers-Vers
    if (!user.allersVersId) {
      return { success: false, error: "Agent non lié à une structure Allers-Vers" };
    }

    // 4. Récupérer la qualification
    const qualification = await qualificationService.getLatestQualification(parcoursId);

    return { success: true, data: qualification };
  } catch (error) {
    console.error("[getProspectQualificationAction] Erreur:", error);
    return { success: false, error: "Erreur lors de la récupération de la qualification" };
  }
}
