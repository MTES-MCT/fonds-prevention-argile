"use server";

import { z } from "zod";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { hasPermission } from "@/features/auth/permissions/services/rbac.service";
import { BackofficePermission } from "@/features/auth/permissions/domain/value-objects/rbac-permissions";
import { UserRole } from "@/shared/domain/value-objects";
import type { ActionResult } from "@/shared/types";
import { refusAccesEspaceAgent } from "@/features/backoffice/espace-agent/shared/services/acces-espace-agent.service";
import { detecterDoublonDemandeur, presenterDoublonPourAgent } from "../services/doublon-demandeur.service";
import type { DoublonDemandeur } from "../domain/doublon";

const emailSchema = z.string().trim().email("Email invalide");

/** Prévient l'agent dès la saisie de l'email, avant qu'il ne fasse la simulation pour rien. */
export async function verifierEmailDemandeurAction(email: string): Promise<ActionResult<DoublonDemandeur | null>> {
  const refusEspaceAgent = await refusAccesEspaceAgent();
  if (refusEspaceAgent) return { success: false, error: refusEspaceAgent };

  const user = await getCurrentUser();
  if (!user?.agentId) return { success: false, error: "Non authentifié" };

  const role = user.role as UserRole;
  if (!hasPermission(role, BackofficePermission.DOSSIERS_CREATE)) {
    return { success: false, error: "Permission refusée" };
  }

  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Email invalide" };

  try {
    const doublon = await detecterDoublonDemandeur({ email: parsed.data });
    if (!doublon) return { success: true, data: null };
    return {
      success: true,
      data: await presenterDoublonPourAgent(doublon, {
        id: user.agentId,
        role,
        entrepriseAmoId: user.entrepriseAmoId ?? null,
        allersVersId: user.allersVersId ?? null,
      }),
    };
  } catch (error) {
    console.error("[verifierEmailDemandeurAction] Erreur :", error instanceof Error ? error.name : "inconnue");
    return { success: false, error: "Vérification de l'email impossible" };
  }
}
