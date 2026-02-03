import { db } from "@/shared/database/client";
import { parcoursPrevention, users } from "@/shared/database/schema";
import { eq } from "drizzle-orm";
import { calculateAgentScope } from "@/features/auth/permissions/services/agent-scope.service";
import type { AgentScopeInput } from "@/features/auth/permissions/domain/types/agent-scope.types";
import type { ProspectDetail } from "../domain/types";
import type { ActionResult } from "@/shared/types/action-result.types";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { UserRole } from "@/shared/domain/value-objects";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { daysSince } from "@/shared/utils/date-diff";

/**
 * Récupérer le détail d'un prospect par son ID de parcours
 * Vérifie que l'utilisateur connecté peut voir ce prospect (même territoire)
 */
export async function getProspectDetail(parcoursId: string): Promise<ActionResult<ProspectDetail>> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Non authentifié" };
    }

    // Les admins peuvent tout voir
    const isAdmin = user.role === UserRole.SUPER_ADMINISTRATEUR || user.role === UserRole.ADMINISTRATEUR;

    // Vérifier les permissions pour les non-admins
    if (!isAdmin) {
      const canViewProspects =
        user.role === UserRole.ALLERS_VERS || user.role === UserRole.AMO_ET_ALLERS_VERS;

      if (!canViewProspects) {
        return { success: false, error: "Accès réservé aux agents Allers-Vers" };
      }

      if (!user.allersVersId) {
        return { success: false, error: "Votre compte Allers-Vers n'est pas configuré" };
      }
    }

    // Récupérer les données du parcours avec l'utilisateur
    const [result] = await db
      .select({
        parcours: parcoursPrevention,
        user: users,
      })
      .from(parcoursPrevention)
      .innerJoin(users, eq(parcoursPrevention.userId, users.id))
      .where(eq(parcoursPrevention.id, parcoursId))
      .limit(1);

    if (!result) {
      return { success: false, error: "Prospect non trouvé" };
    }

    // Extraire les données de logement
    const rgaData = result.parcours.rgaSimulationData as any;
    const logement = rgaData?.logement || {};

    // Vérifier que le prospect est dans le territoire de l'agent (sauf admins)
    if (!isAdmin && user.allersVersId) {
      const agentInput: AgentScopeInput = {
        id: user.agentId ?? "",
        role: user.role as UserRole,
        entrepriseAmoId: user.entrepriseAmoId ?? null,
        allersVersId: user.allersVersId ?? null,
      };

      const scope = await calculateAgentScope(agentInput);

      const codeDepartement = logement.code_departement;
      const codeEpci = logement.epci;

      const matchesDepartement =
        scope.departements.length > 0 && codeDepartement && scope.departements.includes(codeDepartement);
      const matchesEpci = scope.epcis.length > 0 && codeEpci && scope.epcis.includes(codeEpci);

      if (!matchesDepartement && !matchesEpci) {
        return { success: false, error: "Ce prospect n'est pas dans votre territoire" };
      }
    }

    // Construire l'objet ProspectDetail
    const prospectDetail: ProspectDetail = {
      parcoursId: result.parcours.id,
      particulier: {
        prenom: result.user.prenom || "",
        nom: result.user.nom || "",
        email: result.user.email || "",
      },
      logement: {
        adresse: logement.adresse || "Adresse non renseignée",
        commune: logement.commune_nom || logement.commune || "Commune non renseignée",
        codePostal: logement.codePostal || "",
        codeDepartement: logement.code_departement || "",
        codeEpci: logement.epci || undefined,
      },
      currentStep: result.parcours.currentStep as Step,
      createdAt: result.parcours.createdAt,
      updatedAt: result.parcours.updatedAt,
      daysSinceLastAction: daysSince(result.parcours.updatedAt),
      stepsHistory: [], // TODO: implémenter l'historique si nécessaire
    };

    return { success: true, data: prospectDetail };
  } catch (error) {
    console.error("Erreur getProspectDetail:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération du prospect",
    };
  }
}
