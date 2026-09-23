"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { hasPermission } from "@/features/auth/permissions/services/rbac.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { UserRole } from "@/shared/domain/value-objects";
import { ACCOMPAGNEMENT_SOUHAITE_VALUES } from "@/shared/domain/value-objects/accompagnement-souhaite.enum";
import { QualificationDecision } from "../domain/types";
import { qualificationService, type QualifyProspectResult } from "../services/qualification.service";
import { assertNotSuperAdminReadOnly } from "@/features/backoffice/shared/actions/super-admin-access";
import { verifyProspectTerritoryAccess } from "@/features/auth/permissions/services/agent-scope.service";
import { assertCanActAsResponsable } from "@/features/auth/permissions/services/responsable-permissions.service";
import { resolveEspaceAgentPath } from "@/features/backoffice/espace-agent/dossiers/services/admin-url-resolver.service";
import type { ProspectQualification } from "@/shared/database/schema/prospect-qualifications";
import type { ActionResult } from "@/shared/types";

// --- Validation Zod ---

const qualifyProspectSchema = z
  .object({
    parcoursId: z.string().uuid(),
    decision: z.enum([
      QualificationDecision.ELIGIBLE,
      QualificationDecision.A_QUALIFIER,
      QualificationDecision.NON_ELIGIBLE,
    ]),
    actionsRealisees: z.array(z.string()).optional(),
    raisonsIneligibilite: z.array(z.string()).optional(),
    estMandataireFinancier: z.boolean().optional(),
    accompagnementSouhaite: z.enum(ACCOMPAGNEMENT_SOUHAITE_VALUES).optional(),
    note: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.decision === QualificationDecision.NON_ELIGIBLE) {
        return data.raisonsIneligibilite && data.raisonsIneligibilite.length > 0;
      }
      return true;
    },
    {
      message: "Au moins une raison d'inéligibilité est requise",
      path: ["raisonsIneligibilite"],
    }
  );

type QualifyProspectInput = z.infer<typeof qualifyProspectSchema>;

/** Rôles portant la casquette AMO : eux seuls peuvent valider au nom de leur entreprise. */
const ROLES_CAPACITE_AMO: readonly UserRole[] = [UserRole.AMO, UserRole.AMO_ET_ALLERS_VERS];

/**
 * Où emmener l'agent après sa qualification, selon ce qu'il conserve comme accès.
 *
 *  - une validation existe désormais (sa structure accompagne, ou le demandeur poursuit
 *    seul) → le dossier, car le parcours a cessé d'être un prospect ;
 *  - il a passé la main à une AMO → le listing, car l'écran de décision ne lui est pas
 *    ouvert (un Aller-vers pur y récoltait un 404) ;
 *  - rien n'a été écrit → il reste sur place.
 */
async function resoudreRetour(parcoursId: string, resultat: QualifyProspectResult): Promise<string | null> {
  switch (resultat.suiteAccompagnement?.issue) {
    case "validee_par_la_structure":
    case "autonomie":
      return resolveEspaceAgentPath(parcoursId);
    case "transmise":
      return "/espace-agent/dossiers";
    default:
      return null;
  }
}

// --- Actions ---

/**
 * Qualifie un prospect (éligible, non éligible, à qualifier)
 *
 * Vérifie que l'agent connecté est un agent Allers-Vers.
 */
export async function qualifyProspectAction(
  input: QualifyProspectInput
): Promise<ActionResult<QualifyProspectResult & { redirectTo: string | null }>> {
  try {
    const readOnlyError = await assertNotSuperAdminReadOnly();
    if (readOnlyError) return { success: false, error: readOnlyError };

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
      // Seuls nos `refine` (code "custom") portent un message en français ; les échecs
      // techniques de Zod sont en anglais et n'ont rien à faire à l'écran d'un agent.
      const messageMetier = parsed.error.issues.find((issue) => issue.code === "custom")?.message;
      return { success: false, error: messageMetier ?? "Données invalides" };
    }

    const {
      parcoursId,
      decision,
      actionsRealisees,
      raisonsIneligibilite,
      estMandataireFinancier,
      accompagnementSouhaite,
      note,
    } = parsed.data;

    // 5. Garde responsable : seul le responsable courant peut qualifier
    const guard = await assertCanActAsResponsable(parcoursId, {
      entrepriseAmoId: user.entrepriseAmoId ?? null,
      allersVersId: user.allersVersId,
    });
    if (!guard.ok) return { success: false, error: guard.error };

    // 6. Logique métier
    const resultat = await qualificationService.qualifyProspect({
      parcoursId,
      agentId: user.agentId,
      decision,
      actionsRealisees,
      raisonsIneligibilite,
      estMandataireFinancier,
      accompagnementSouhaite,
      note,
      // La capacité AMO vient du rôle, pas de la seule présence d'une entreprise en base :
      // sans elle, un agent Aller-vers pur validerait au nom d'une AMO.
      contexteAgent: {
        entrepriseAmoId: user.entrepriseAmoId ?? null,
        aLaCapaciteAmo: ROLES_CAPACITE_AMO.includes(role),
      },
    });

    // 7. Invalidation du cache
    revalidatePath("/espace-agent", "layout");

    return { success: true, data: { ...resultat, redirectTo: await resoudreRetour(parcoursId, resultat) } };
  } catch (error) {
    console.error("[qualifyProspectAction] Erreur:", error);
    return { success: false, error: "Erreur lors de la qualification du prospect" };
  }
}

/**
 * Récupère la dernière qualification d'un prospect
 */
export async function getProspectQualificationAction(
  parcoursId: string
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

    // 4. Vérification territoriale
    const territoryError = await verifyProspectTerritoryAccess(parcoursId, {
      id: user.agentId ?? "",
      role,
      entrepriseAmoId: user.entrepriseAmoId ?? null,
      allersVersId: user.allersVersId,
    });
    if (territoryError) {
      return { success: false, error: territoryError };
    }

    // 5. Récupérer la qualification
    const qualification = await qualificationService.getLatestQualification(parcoursId);

    return { success: true, data: qualification };
  } catch (error) {
    console.error("[getProspectQualificationAction] Erreur:", error);
    return { success: false, error: "Erreur lors de la récupération de la qualification" };
  }
}
