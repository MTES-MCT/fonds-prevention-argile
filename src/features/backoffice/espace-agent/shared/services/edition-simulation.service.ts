import { db } from "@/shared/database/client";
import { parcoursAmoValidations, parcoursPrevention, users } from "@/shared/database/schema";
import { eq } from "drizzle-orm";
import type { ActionResult } from "@/shared/types/action-result.types";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { UserRole } from "@/shared/domain/value-objects";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { getEffectiveRGAData } from "@/features/parcours/core/services/rga-data.service";

export interface DossierSimulationData {
  /** ID de la validation AMO (dossier/demande) — null pour les prospects */
  dossierId: string | null;
  /** ID du parcours */
  parcoursId: string;
  /** Prénom du demandeur */
  prenom: string | null;
  /** Nom du demandeur */
  nom: string | null;
  /** Données RGA effectives (agent si éditées, sinon originales) */
  rgaData: RGASimulationData | null;
  /** Statut de la validation AMO (pour distinguer demande vs dossier) — null pour les prospects */
  statut: string | null;
}

/**
 * Récupérer les données de simulation pour édition par un agent (AMO ou allers-vers).
 * Accepte un ID de validation AMO (dossier/demande) ou un ID de parcours (prospect).
 * Vérifie l'authentification et les droits d'accès.
 */
export async function getDossierSimulationData(id: string): Promise<ActionResult<DossierSimulationData>> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Non authentifié" };
    }

    const isAdmin = user.role === UserRole.SUPER_ADMINISTRATEUR || user.role === UserRole.ADMINISTRATEUR;

    // Vérifier les droits d'accès agent
    if (!isAdmin) {
      const canAccess =
        user.role === UserRole.AMO ||
        user.role === UserRole.ALLERS_VERS ||
        user.role === UserRole.AMO_ET_ALLERS_VERS;

      if (!canAccess) {
        return { success: false, error: "Accès réservé aux agents" };
      }
    }

    // 1. Essayer d'abord par ID de validation AMO (dossier/demande)
    const [dossier] = await db
      .select({
        validation: parcoursAmoValidations,
        parcours: parcoursPrevention,
      })
      .from(parcoursAmoValidations)
      .innerJoin(parcoursPrevention, eq(parcoursAmoValidations.parcoursId, parcoursPrevention.id))
      .where(eq(parcoursAmoValidations.id, id))
      .limit(1);

    if (dossier) {
      // Vérifier que le statut permet l'édition (en attente ou validé)
      const editableStatuts = [StatutValidationAmo.EN_ATTENTE, StatutValidationAmo.LOGEMENT_ELIGIBLE];
      if (!editableStatuts.includes(dossier.validation.statut as StatutValidationAmo)) {
        return { success: false, error: "Ce dossier ne permet pas l'édition des données de simulation" };
      }

      // Vérifier ownership entreprise (sauf admins)
      if (!isAdmin) {
        if (!user.entrepriseAmoId) {
          return { success: false, error: "Votre compte agent n'est pas configuré" };
        }

        if (dossier.validation.entrepriseAmoId !== user.entrepriseAmoId) {
          return { success: false, error: "Ce dossier ne vous est pas destiné" };
        }
      }

      const rgaData = getEffectiveRGAData({
        rgaSimulationData: dossier.parcours.rgaSimulationData as RGASimulationData | null,
        rgaSimulationDataAgent: dossier.parcours.rgaSimulationDataAgent as RGASimulationData | null,
      });

      return {
        success: true,
        data: {
          dossierId: dossier.validation.id,
          parcoursId: dossier.parcours.id,
          prenom: dossier.validation.userPrenom,
          nom: dossier.validation.userNom,
          rgaData,
          statut: dossier.validation.statut,
        },
      };
    }

    // 2. Fallback : essayer par ID de parcours (prospect sans validation AMO)
    const [prospect] = await db
      .select({
        parcours: parcoursPrevention,
        user: users,
      })
      .from(parcoursPrevention)
      .innerJoin(users, eq(parcoursPrevention.userId, users.id))
      .where(eq(parcoursPrevention.id, id))
      .limit(1);

    if (!prospect) {
      return { success: false, error: "Dossier non trouvé" };
    }

    // Pour les prospects, vérifier que l'agent allers-vers a accès au territoire
    // (la vérification territoriale est déjà faite en amont par la page prospect)

    const rgaData = getEffectiveRGAData({
      rgaSimulationData: prospect.parcours.rgaSimulationData as RGASimulationData | null,
      rgaSimulationDataAgent: prospect.parcours.rgaSimulationDataAgent as RGASimulationData | null,
    });

    return {
      success: true,
      data: {
        dossierId: null,
        parcoursId: prospect.parcours.id,
        prenom: prospect.user.prenom,
        nom: prospect.user.nom,
        rgaData,
        statut: null,
      },
    };
  } catch (error) {
    console.error("Erreur getDossierSimulationData:", error);
    return {
      success: false,
      error: "Erreur lors de la récupération des données de simulation",
    };
  }
}
