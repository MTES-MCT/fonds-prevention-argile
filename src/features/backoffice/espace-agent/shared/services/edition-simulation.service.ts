import { db } from "@/shared/database/client";
import { parcoursAmoValidations, parcoursPrevention } from "@/shared/database/schema";
import { eq } from "drizzle-orm";
import type { ActionResult } from "@/shared/types/action-result.types";
import type { RGASimulationData } from "@/shared/domain/types/rga-simulation.types";
import { getCurrentUser } from "@/features/auth/services/user.service";
import { UserRole } from "@/shared/domain/value-objects";
import { StatutValidationAmo } from "@/shared/domain/value-objects/statut-validation-amo.enum";
import { getEffectiveRGAData } from "@/features/parcours/core/services/rga-data.service";

export interface DossierSimulationData {
  /** ID de la validation AMO (dossier) */
  dossierId: string;
  /** ID du parcours */
  parcoursId: string;
  /** Prénom du demandeur */
  prenom: string | null;
  /** Nom du demandeur */
  nom: string | null;
  /** Données RGA effectives (agent si éditées, sinon originales) */
  rgaData: RGASimulationData | null;
}

/**
 * Récupérer les données de simulation d'un dossier pour édition par un agent (AMO ou allers-vers).
 * Vérifie l'authentification et les droits d'accès.
 */
export async function getDossierSimulationData(dossierId: string): Promise<ActionResult<DossierSimulationData>> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Non authentifié" };
    }

    const isAdmin = user.role === UserRole.SUPER_ADMINISTRATEUR || user.role === UserRole.ADMINISTRATEUR;

    const [dossier] = await db
      .select({
        validation: parcoursAmoValidations,
        parcours: parcoursPrevention,
      })
      .from(parcoursAmoValidations)
      .innerJoin(parcoursPrevention, eq(parcoursAmoValidations.parcoursId, parcoursPrevention.id))
      .where(eq(parcoursAmoValidations.id, dossierId))
      .limit(1);

    if (!dossier) {
      return { success: false, error: "Dossier non trouvé" };
    }

    // Vérifier que le statut permet l'édition (en attente ou validé)
    const editableStatuts = [StatutValidationAmo.EN_ATTENTE, StatutValidationAmo.LOGEMENT_ELIGIBLE];
    if (!editableStatuts.includes(dossier.validation.statut as StatutValidationAmo)) {
      return { success: false, error: "Ce dossier ne permet pas l'édition des données de simulation" };
    }

    // Vérifier les droits d'accès agent (AMO ou allers-vers)
    if (!isAdmin) {
      const canAccess =
        user.role === UserRole.AMO ||
        user.role === UserRole.ALLERS_VERS ||
        user.role === UserRole.AMO_ET_ALLERS_VERS;

      if (!canAccess) {
        return { success: false, error: "Accès réservé aux agents" };
      }

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
