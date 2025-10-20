import { eq } from "drizzle-orm";
import { db } from "@/shared/database/client";
import {
  amoValidationTokens,
  parcoursAmoValidations,
  parcoursPrevention,
  users,
} from "@/shared/database/schema";
import { parcoursRepo } from "@/shared/database/repositories";

import { checkAmoCoversCodeInsee, getAmoById } from "./amo-query.service";
import { ActionResult } from "@/shared/types/action-result.types";
import {
  AMO_VALIDATION_TOKEN_VALIDITY_DAYS,
  StatutValidationAmo,
} from "../domain/value-objects";
import { sendValidationAmoEmail } from "@/shared/email/actions/send-email.actions";
import { ValidationAmoComplete, ValidationAmoData } from "../domain/entities";
import { Status, Step } from "../../core";

/**
 * Service de gestion des validations AMO
 */

/**
 * Sélectionne un AMO pour l'utilisateur
 */
export async function selectAmoForUser(
  userId: string,
  params: {
    entrepriseAmoId: string;
    userPrenom: string;
    userNom: string;
    adresseLogement: string;
  }
): Promise<ActionResult<{ message: string; token: string }>> {
  const { entrepriseAmoId, userPrenom, userNom, adresseLogement } = params;

  // Validation des données personnelles
  if (!userPrenom?.trim()) {
    return { success: false, error: "Le prénom est requis" };
  }
  if (!userNom?.trim()) {
    return { success: false, error: "Le nom est requis" };
  }
  if (!adresseLogement?.trim()) {
    return { success: false, error: "L'adresse du logement est requise" };
  }

  // Récupérer le parcours de l'utilisateur
  const parcours = await parcoursRepo.findByUserId(userId);
  if (!parcours) {
    return { success: false, error: "Parcours non trouvé" };
  }

  // Vérifier qu'on est bien à l'étape CHOIX_AMO
  if (parcours.currentStep !== Step.CHOIX_AMO) {
    return {
      success: false,
      error: "Vous n'êtes pas à l'étape de choix de l'AMO",
    };
  }

  // Récupérer le code INSEE de l'utilisateur
  const [user] = await db
    .select({ codeInsee: users.codeInsee })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.codeInsee) {
    return { success: false, error: "Code INSEE manquant" };
  }

  // Vérifier que l'AMO couvre le code INSEE
  const amoCovers = await checkAmoCoversCodeInsee(
    entrepriseAmoId,
    user.codeInsee
  );
  if (!amoCovers) {
    return {
      success: false,
      error: "Cette AMO ne couvre pas votre commune ou département",
    };
  }

  // Créer ou mettre à jour la validation AMO
  const [validation] = await db
    .insert(parcoursAmoValidations)
    .values({
      parcoursId: parcours.id,
      entrepriseAmoId,
      statut: "en_attente" as StatutValidationAmo,
      userPrenom: userPrenom.trim(),
      userNom: userNom.trim(),
      adresseLogement: adresseLogement.trim(),
    })
    .onConflictDoUpdate({
      target: parcoursAmoValidations.parcoursId,
      set: {
        entrepriseAmoId,
        statut: "en_attente" as StatutValidationAmo,
        choisieAt: new Date(),
        valideeAt: null,
        commentaire: null,
        userPrenom: userPrenom.trim(),
        userNom: userNom.trim(),
        adresseLogement: adresseLogement.trim(),
      },
    })
    .returning();

  if (!validation) {
    return {
      success: false,
      error: "Erreur lors de la création de la validation",
    };
  }

  // Générer un token unique
  const token = crypto.randomUUID();

  // Calculer la date d'expiration
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + AMO_VALIDATION_TOKEN_VALIDITY_DAYS);

  // Créer le token de validation
  await db.insert(amoValidationTokens).values({
    parcoursAmoValidationId: validation.id,
    token,
    expiresAt,
  });

  // Récupérer les infos de l'AMO pour l'email
  const amo = await getAmoById(entrepriseAmoId);
  if (!amo) {
    return { success: false, error: "AMO non trouvée" };
  }

  // Envoyer l'email de validation à l'AMO
  const emailsList = amo.emails.split(";").map((e) => e.trim());

  const emailResult = await sendValidationAmoEmail({
    amoEmail: emailsList,
    amoNom: amo.nom,
    demandeurNom: userNom,
    demandeurPrenom: userPrenom,
    demandeurCodeInsee: user.codeInsee,
    adresseLogement,
    token,
  });

  if (!emailResult.success) {
    console.error("Erreur envoi email AMO:", emailResult.error);
    // On continue quand même, l'email n'est pas bloquant
  }

  // Passer le parcours en EN_INSTRUCTION
  await parcoursRepo.updateStatus(parcours.id, Status.EN_INSTRUCTION);

  return {
    success: true,
    data: {
      message: "AMO sélectionnée avec succès",
      token,
    },
  };
}

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
      statut: "logement_eligible" as StatutValidationAmo,
      commentaire: commentaire || null,
      valideeAt: new Date(),
    })
    .where(eq(parcoursAmoValidations.id, validationId));

  // Marquer le token comme utilisé
  await db
    .update(amoValidationTokens)
    .set({ usedAt: new Date() })
    .where(eq(amoValidationTokens.parcoursAmoValidationId, validationId));

  // Supprimer les données personnelles (RGPD)
  await deleteUserPersonalData(validationId);

  // Passer le parcours en VALIDE
  await parcoursRepo.updateStatus(validation.parcoursId, Status.VALIDE);

  // Faire progresser vers l'étape ELIGIBILITE
  const progressResult = await progressParcours(parcours.userId);

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
      statut: "logement_non_eligible" as StatutValidationAmo,
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

  // Supprimer les données personnelles (RGPD)
  await deleteUserPersonalData(validationId);

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
      statut: "accompagnement_refuse" as StatutValidationAmo,
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

  // Supprimer les données personnelles (RGPD)
  await deleteUserPersonalData(validationId);

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
export async function getValidationByToken(
  token: string
): Promise<ActionResult<ValidationAmoData>> {
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
      adresseLogement: parcoursAmoValidations.adresseLogement,
      parcoursId: parcoursPrevention.id,
      userCodeInsee: users.codeInsee,
    })
    .from(amoValidationTokens)
    .innerJoin(
      parcoursAmoValidations,
      eq(amoValidationTokens.parcoursAmoValidationId, parcoursAmoValidations.id)
    )
    .innerJoin(
      parcoursPrevention,
      eq(parcoursAmoValidations.parcoursId, parcoursPrevention.id)
    )
    .innerJoin(users, eq(parcoursPrevention.userId, users.id))
    .where(eq(amoValidationTokens.token, token))
    .limit(1);

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
        codeInsee: tokenData.userCodeInsee || "",
        nom: tokenData.userNom || "",
        prenom: tokenData.userPrenom || "",
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

/**
 * Supprime les données personnelles (RGPD)
 */
async function deleteUserPersonalData(validationId: string): Promise<void> {
  await db
    .update(parcoursAmoValidations)
    .set({
      userPrenom: null,
      userNom: null,
      adresseLogement: null,
    })
    .where(eq(parcoursAmoValidations.id, validationId));
}
