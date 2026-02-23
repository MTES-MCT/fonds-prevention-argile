import { db } from "@/shared/database/client";
import { parcoursPrevention, users } from "@/shared/database/schema";
import { eq } from "drizzle-orm";
import { calculateAgentScope } from "@/features/auth/permissions/services/agent-scope.service";
import type { AgentScopeInput } from "@/features/auth/permissions/domain/types/agent-scope.types";
import type { ProspectDetail, ProspectAmoInfo } from "../domain/types";
import type { ActionResult } from "@/shared/types/action-result.types";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { UserRole } from "@/shared/domain/value-objects";
import { Step } from "@/shared/domain/value-objects/step.enum";
import { daysSince } from "@/shared/utils/date-diff";
import { parseCoordinatesString } from "@/shared/utils/geo.utils";
import { calculateNiveauRevenuFromRga } from "@/features/simulateur/domain/types/rga-revenus.types";
import { getEffectiveRGAData } from "@/features/parcours/core/services/rga-data.service";
import type { InfoLogement } from "@/features/backoffice/espace-agent/demandes/domain/types";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import { entreprisesAmoRepository } from "@/shared/database/repositories/entreprises-amo.repository";

function buildAdresseComplete(logement: Partial<RGASimulationData["logement"]>): string {
  const parts = [logement.adresse, logement.commune].filter(Boolean);
  if (parts.length === 0) return "Adresse non renseignée";

  // commune est le code postal (ex: "36200"), commune_nom est le nom
  const rue = logement.adresse || "";
  const codePostal = logement.commune || "";
  const ville = logement.commune_nom || "";

  if (rue && codePostal && ville) {
    return `${rue}, ${codePostal} ${ville}`;
  }
  if (rue && ville) {
    return `${rue}, ${ville}`;
  }
  return rue || "Adresse non renseignée";
}

/**
 * Détermine le statut AMO d'un prospect :
 * Un prospect n'a par définition pas de validation AMO,
 * on cherche simplement les AMO disponibles dans le territoire du logement.
 */
async function resolveAmoInfo(
  codeInsee: string,
  codeDepartement: string
): Promise<ProspectAmoInfo> {
  if (codeInsee && codeDepartement) {
    const amosDisponibles = await entreprisesAmoRepository.findByCodeInsee(codeInsee, codeDepartement);

    if (amosDisponibles.length > 0) {
      return { status: "amo_disponibles", amosDisponibles };
    }
  }

  return { status: "aucun_amo_disponible" };
}

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
    // Utiliser les données agent si disponibles, sinon les données initiales
    const rgaData = getEffectiveRGAData(result.parcours);
    const logement = rgaData?.logement;

    // Vérifier que le prospect est dans le territoire de l'agent (sauf admins)
    if (!isAdmin && user.allersVersId) {
      const agentInput: AgentScopeInput = {
        id: user.agentId ?? "",
        role: user.role as UserRole,
        entrepriseAmoId: user.entrepriseAmoId ?? null,
        allersVersId: user.allersVersId ?? null,
      };

      const scope = await calculateAgentScope(agentInput);

      const codeDepartement = logement?.code_departement;
      const codeEpci = logement?.epci;

      const matchesDepartement =
        scope.departements.length > 0 && codeDepartement && scope.departements.includes(codeDepartement);
      const matchesEpci = scope.epcis.length > 0 && codeEpci && scope.epcis.includes(codeEpci);

      if (!matchesDepartement && !matchesEpci) {
        return { success: false, error: "Ce prospect n'est pas dans votre territoire" };
      }
    }

    // Construire l'objet InfoLogement à partir de RGASimulationData
    const coords = parseCoordinatesString(rgaData?.logement?.coordonnees);
    const niveauRevenu = calculateNiveauRevenuFromRga(rgaData);
    const infoLogement: InfoLogement = {
      anneeConstruction: rgaData?.logement?.annee_de_construction || null,
      nombreNiveaux: rgaData?.logement?.niveaux?.toString() || null,
      etatMaison: rgaData?.rga?.sinistres || null,
      zoneExposition: rgaData?.logement?.zone_dexposition || null,
      indemnisationPasseeRGA: rgaData?.rga?.indemnise_indemnise_rga ?? null,
      indemnisationAvantJuillet2025: rgaData?.rga?.indemnise_avant_juillet_2025 ?? null,
      indemnisationAvantJuillet2015: rgaData?.rga?.indemnise_avant_juillet_2015 ?? null,
      montantIndemnisation: rgaData?.rga?.indemnise_montant_indemnite ?? null,
      nombreHabitants: rgaData?.menage?.personnes || null,
      niveauRevenu,
      codeInsee: rgaData?.logement?.commune || null,
      lat: coords?.lat ?? null,
      lon: coords?.lon ?? null,
      rnbId: rgaData?.logement?.rnb || null,
    };

    // Déterminer le statut AMO du prospect
    const amoInfo = await resolveAmoInfo(
      logement?.commune || "",
      logement?.code_departement || ""
    );

    // Construire l'objet ProspectDetail
    const prospectDetail: ProspectDetail = {
      parcoursId: result.parcours.id,
      situationParticulier: result.parcours.situationParticulier,
      particulier: {
        prenom: result.user.prenom || "",
        nom: result.user.nom || "",
        email: result.user.email || "",
        telephone: result.user.telephone || null,
      },
      logement: {
        adresse: logement ? buildAdresseComplete(logement) : "Adresse non renseignée",
        commune: logement?.commune_nom || logement?.commune || "Commune non renseignée",
        codePostal: logement?.commune || "",
        codeDepartement: logement?.code_departement || "",
        codeEpci: logement?.epci || undefined,
      },
      currentStep: result.parcours.currentStep as Step,
      createdAt: result.parcours.createdAt,
      updatedAt: result.parcours.updatedAt,
      daysSinceLastAction: daysSince(result.parcours.updatedAt),
      infoLogement,
      amoInfo,
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

