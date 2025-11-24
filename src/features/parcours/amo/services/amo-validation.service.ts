import { eq } from "drizzle-orm";
import { db } from "@/shared/database/client";
import { amoValidationTokens, parcoursAmoValidations, parcoursPrevention } from "@/shared/database/schema";
import { parcoursRepo } from "@/shared/database/repositories";

import { getAmoById } from "./amo-query.service";
import { ActionResult } from "@/shared/types/action-result.types";
import { StatutValidationAmo } from "../domain/value-objects";
import { ValidationAmoData } from "../domain/entities";
import { Status } from "../../core";
import { moveToNextStep } from "../../core/services";
import { normalizeCodeInsee } from "../utils/amo.utils";

/**
 * Service de gestion des validations AMO (approve/reject/get)
 * La sélection AMO est dans amo-selection.service.ts
 */

/**
 * Approuve la validation (logement éligible)
 */
export async function approveValidation(
  validationId: string,
  commentaire?: string
): Promise<ActionResult<{ message: string }>> {
  // Récupérer la validation
  const [validation] = await db
    .select({
      id: parcoursAmoValidations.id,
      parcoursId: parcoursAmoValidations.parcoursId,
    })
    .from(parcoursAmoValidations)
    .where(eq(parcoursAmoValidations.id, validationId))
    .limit(1);

  if (!validation) {
    return { success: false, error: "Validation non trouvée" };
  }

  // Récupérer le parcours
  const parcours = await parcoursRepo.findById(validation.parcoursId);
  if (!parcours) {
    return { success: false, error: "Parcours non trouvé" };
  }

  // Mettre à jour la validation AMO
  await db
    .update(parcoursAmoValidations)
    .set({
      statut: StatutValidationAmo.LOGEMENT_ELIGIBLE,
      commentaire: commentaire || null,
      valideeAt: new Date(),
    })
    .where(eq(parcoursAmoValidations.id, validationId));

  // Marquer le token comme utilisé
  await db
    .update(amoValidationTokens)
    .set({ usedAt: new Date() })
    .where(eq(amoValidationTokens.parcoursAmoValidationId, validationId));

  // Passer le parcours en VALIDE
  await parcoursRepo.updateStatus(validation.parcoursId, Status.VALIDE);

  // Faire progresser vers l'étape ELIGIBILITE
  const progressResult = await moveToNextStep(parcours.userId);

  if (!progressResult.success) {
    return {
      success: false,
      error: "Erreur lors de la progression vers l'éligibilité",
    };
  }

  return {
    success: true,
    data: { message: "Logement validé comme éligible" },
  };
}

/**
 * Refuse l'éligibilité du logement
 */
export async function rejectEligibility(
  validationId: string,
  commentaire: string
): Promise<ActionResult<{ message: string }>> {
  const [validation] = await db
    .update(parcoursAmoValidations)
    .set({
      statut: StatutValidationAmo.LOGEMENT_NON_ELIGIBLE,
      commentaire,
      valideeAt: new Date(),
    })
    .where(eq(parcoursAmoValidations.id, validationId))
    .returning();

  if (!validation) {
    return { success: false, error: "Validation non trouvée" };
  }

  // Marquer le token comme utilisé
  await db
    .update(amoValidationTokens)
    .set({ usedAt: new Date() })
    .where(eq(amoValidationTokens.parcoursAmoValidationId, validationId));

  // Repasser le parcours en TODO
  await parcoursRepo.updateStatus(validation.parcoursId, Status.TODO);

  return {
    success: true,
    data: { message: "Logement refusé : non éligible" },
  };
}

/**
 * Refuse l'accompagnement
 */
export async function rejectAccompagnement(
  validationId: string,
  commentaire: string
): Promise<ActionResult<{ message: string }>> {
  const [validation] = await db
    .update(parcoursAmoValidations)
    .set({
      statut: StatutValidationAmo.ACCOMPAGNEMENT_REFUSE,
      commentaire,
      valideeAt: new Date(),
    })
    .where(eq(parcoursAmoValidations.id, validationId))
    .returning();

  if (!validation) {
    return { success: false, error: "Validation non trouvée" };
  }

  // Marquer le token comme utilisé
  await db
    .update(amoValidationTokens)
    .set({ usedAt: new Date() })
    .where(eq(amoValidationTokens.parcoursAmoValidationId, validationId));

  // Repasser le parcours en TODO
  await parcoursRepo.updateStatus(validation.parcoursId, Status.TODO);

  return {
    success: true,
    data: { message: "Accompagnement refusé" },
  };
}

/**
 * Récupère les données de validation par token
 */
export async function getValidationByToken(token: string): Promise<ActionResult<ValidationAmoData>> {
  // Récupérer le token avec toutes les données associées
  const [tokenData] = await db
    .select({
      tokenId: amoValidationTokens.id,
      expiresAt: amoValidationTokens.expiresAt,
      usedAt: amoValidationTokens.usedAt,
      validationId: parcoursAmoValidations.id,
      statut: parcoursAmoValidations.statut,
      choisieAt: parcoursAmoValidations.choisieAt,
      entrepriseAmoId: parcoursAmoValidations.entrepriseAmoId,
      userNom: parcoursAmoValidations.userNom,
      userPrenom: parcoursAmoValidations.userPrenom,
      userEmail: parcoursAmoValidations.userEmail,
      userTelephone: parcoursAmoValidations.userTelephone,
      adresseLogement: parcoursAmoValidations.adresseLogement,
      parcoursId: parcoursPrevention.id,
      rgaSimulationData: parcoursPrevention.rgaSimulationData,
    })
    .from(amoValidationTokens)
    .innerJoin(parcoursAmoValidations, eq(amoValidationTokens.parcoursAmoValidationId, parcoursAmoValidations.id))
    .innerJoin(parcoursPrevention, eq(parcoursAmoValidations.parcoursId, parcoursPrevention.id))
    .where(eq(amoValidationTokens.token, token))
    .limit(1);

  const userCodeInsee = normalizeCodeInsee(tokenData?.rgaSimulationData?.logement?.commune) || "";

  if (!tokenData) {
    return {
      success: false,
      error: "Token invalide ou introuvable",
    };
  }

  const isExpired = tokenData.expiresAt < new Date();
  if (isExpired) {
    return {
      success: false,
      error: "Ce token a expiré",
    };
  }

  // Récupérer l'AMO
  const amo = await getAmoById(tokenData.entrepriseAmoId);
  if (!amo) {
    return {
      success: false,
      error: "AMO non trouvée",
    };
  }

  return {
    success: true,
    data: {
      validationId: tokenData.validationId,
      entrepriseAmo: amo,
      demandeur: {
        codeInsee: userCodeInsee,
        nom: tokenData.userNom || "",
        prenom: tokenData.userPrenom || "",
        email: tokenData.userEmail || "",
        telephone: tokenData.userTelephone || "",
        adresseLogement: tokenData.adresseLogement || "",
      },
      statut: tokenData.statut,
      choisieAt: tokenData.choisieAt,
      usedAt: tokenData.usedAt,
      isExpired,
      isUsed: !!tokenData.usedAt,
    },
  };
}
