"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { hasPermission } from "@/features/auth/permissions/services/rbac.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { UserRole } from "@/shared/domain/value-objects";
import { assertNotSuperAdminReadOnly } from "@/features/backoffice/shared/actions/super-admin-access";
import type { ActionResult } from "@/shared/types";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import { createDossierByAgent } from "../services/creation-dossier.service";

const createDossierSchema = z.object({
  demandeur: z.object({
    nom: z.string().trim().min(1, "Le nom est requis"),
    prenom: z.string().trim().min(1, "Le prénom est requis"),
    email: z.string().trim().email("Email invalide"),
    telephone: z
      .string()
      .trim()
      .regex(/^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/, "Numéro de téléphone invalide")
      .optional()
      .or(z.literal("").transform(() => undefined)),
  }),
  adresseBien: z.string().trim().min(1, "L'adresse du bien est requise"),
  // Simulation complète optionnelle (parcours 2). On laisse le service stocker tel quel.
  rgaSimulationDataAgent: z.unknown().optional(),
  sendEmail: z.boolean(),
});

type CreateDossierInput = z.infer<typeof createDossierSchema>;

/**
 * Crée un dossier pour un demandeur à l'initiative d'un agent Aller-vers.
 *
 * Accès restreint : ALLERS_VERS ou AMO_ET_ALLERS_VERS (via PROSPECTS_VIEW).
 */
export async function createDossierAllerVersAction(
  input: CreateDossierInput
): Promise<ActionResult<{ parcoursId: string; claimUrl: string; emailSent: boolean }>> {
  try {
    const readOnlyError = await assertNotSuperAdminReadOnly();
    if (readOnlyError) return { success: false, error: readOnlyError };

    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Non authentifié" };
    }

    const role = user.role as UserRole;
    if (!hasPermission(role, BackofficePermission.PROSPECTS_VIEW)) {
      return { success: false, error: "Permission refusée" };
    }

    if (!user.allersVersId) {
      return { success: false, error: "Agent non lié à une structure Allers-vers" };
    }

    if (!user.agentId) {
      return { success: false, error: "Agent non configuré" };
    }

    const parsed = createDossierSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Données invalides";
      return { success: false, error: firstError };
    }

    const result = await createDossierByAgent({
      agentId: user.agentId,
      demandeur: parsed.data.demandeur,
      adresseBien: parsed.data.adresseBien,
      rgaSimulationDataAgent: parsed.data.rgaSimulationDataAgent as RGASimulationData | undefined,
      sendEmail: parsed.data.sendEmail,
    });

    revalidatePath("/espace-agent", "layout");

    return {
      success: true,
      data: {
        parcoursId: result.parcoursId,
        claimUrl: result.claimUrl,
        emailSent: result.emailSent,
      },
    };
  } catch (error) {
    console.error("[createDossierAllerVersAction] Erreur:", error);
    return { success: false, error: "Erreur lors de la création du dossier" };
  }
}
